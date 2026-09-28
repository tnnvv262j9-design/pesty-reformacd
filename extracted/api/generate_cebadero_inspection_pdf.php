<?php
require_once 'db_connect.php';

$fpdf_paths = [
    __DIR__ . '/../fpdf/fpdf.php',
    '../fpdf/fpdf.php',
    '../../fpdf/fpdf.php',
    'fpdf/fpdf.php',
    '../lib/fpdf/fpdf.php'
];

$fpdf_loaded = false;
foreach ($fpdf_paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $fpdf_loaded = true;
        break;
    }
}

if (!$fpdf_loaded) {
    http_response_code(500);
    echo 'Error: No se encontró la librería FPDF.';
    exit();
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if ($id === 0 || $company_id === 0) {
    http_response_code(400);
    echo 'Faltan parámetros.';
    exit();
}

$stmt = $conn->prepare(
    "SELECT 
        i.id,
        i.cebadero_id,
        i.inspection_date,
        i.tech_id,
        i.condition_status,
        i.activity_level,
        i.action_taken,
        i.amount_replenished,
        i.evidence_photo_url,
        i.notes,
        c.code AS cebadero_code,
        c.location AS cebadero_location,
        c.area_type AS cebadero_area_type,
        c.device_type AS cebadero_device_type,
        c.target AS cebadero_target,
        c.bait_product AS cebadero_bait_product,
        c.active_ingredient AS cebadero_active_ingredient,
        c.cofepris_registry AS cebadero_cofepris,
        cl.full_name AS client_name,
        cl.address AS client_address,
        t.name AS tech_name,
        co.name AS company_name,
        co.logo_url AS company_logo_url,
        co.brand_color AS brand_color
     FROM cebadero_inspections i
     JOIN cebaderos c ON i.cebadero_id = c.id
     JOIN clients cl ON c.client_id = cl.id
     JOIN companies co ON c.company_id = co.id
     LEFT JOIN technicians t ON i.tech_id = t.id
     WHERE i.id = ? AND c.company_id = ?");
$stmt->bind_param("ii", $id, $company_id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(404);
    echo 'Inspección no encontrada.';
    $conn->close();
    exit();
}

class InspectionPDF extends FPDF {
    public $company_name;
    public $logo_url;
    public $brand_color_rgb;

    function hex2rgb($hex) {
        $hex = str_replace('#', '', $hex);
        if (strlen($hex) === 3) {
            $r = hexdec(str_repeat(substr($hex, 0, 1), 2));
            $g = hexdec(str_repeat(substr($hex, 1, 1), 2));
            $b = hexdec(str_repeat(substr($hex, 2, 1), 2));
            return [$r, $g, $b];
        }
        if (strlen($hex) !== 6) return [52, 211, 153];
        return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
    }

    function Header() {
        if ($this->logo_url && file_exists(__DIR__ . '/../' . $this->logo_url)) {
            $this->Image(__DIR__ . '/../' . $this->logo_url, 170, 8, 30);
        }

        $this->SetFont('Arial', 'B', 18);
        $this->Cell(0, 10, utf8_decode('Reporte de Inspección de Cebadero'), 0, 1, 'L');

        $this->SetFont('Arial', 'B', 11);
        $this->SetTextColor(90, 90, 90);
        $this->Cell(0, 6, utf8_decode($this->company_name ?: ''), 0, 1, 'L');

        $this->SetFont('Arial', '', 9);
        $this->Cell(0, 6, utf8_decode('Fecha de emisión: ') . date('d/m/Y'), 0, 1, 'L');

        $this->Ln(4);
        if ($this->brand_color_rgb) {
            $this->SetDrawColor($this->brand_color_rgb[0], $this->brand_color_rgb[1], $this->brand_color_rgb[2]);
        }
        $this->SetLineWidth(0.5);
        $this->Line(10, $this->GetY(), 200, $this->GetY());
        $this->Ln(8);

        $this->SetTextColor(0, 0, 0);
        $this->SetLineWidth(0.2);
        $this->SetDrawColor(200, 200, 200);
    }

    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(128);
        $this->Cell(0, 10, utf8_decode('Página ') . $this->PageNo(), 0, 0, 'C');
    }

    function SectionTitle($label) {
        $this->SetFont('Arial', 'B', 12);
        if ($this->brand_color_rgb) {
            $this->SetTextColor($this->brand_color_rgb[0], $this->brand_color_rgb[1], $this->brand_color_rgb[2]);
        }
        $this->Cell(0, 6, utf8_decode($label), 0, 1, 'L');
        $this->Ln(2);
        $this->SetTextColor(0, 0, 0);
    }
}

$pdf = new InspectionPDF();
$pdf->company_name = $row['company_name'] ?? '';
$pdf->logo_url = $row['company_logo_url'] ?? '';
$brand_color = $row['brand_color'] ?? '#34D399';
$pdf->brand_color_rgb = $pdf->hex2rgb($brand_color);

$pdf->AddPage();

$pdf->SectionTitle('Datos del Cliente');
$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, 'Cliente:', 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->MultiCell(0, 6, utf8_decode($row['client_name'] ?: ''));

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, utf8_decode('Dirección:'), 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->MultiCell(0, 6, utf8_decode($row['client_address'] ?: ''));
$pdf->Ln(3);

$pdf->SectionTitle('Datos del Cebadero');
$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, 'Código:', 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, utf8_decode($row['cebadero_code'] ?: ''), 0, 1);

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, utf8_decode('Ubicación:'), 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->MultiCell(0, 6, utf8_decode($row['cebadero_location'] ?: ''));

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, 'Tipo:', 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, utf8_decode(($row['cebadero_device_type'] ?: '') . ' (' . ($row['cebadero_area_type'] ?: '') . ')'), 0, 1);

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, 'Objetivo:', 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, utf8_decode($row['cebadero_target'] ?: ''), 0, 1);

$pdf->Ln(3);

$pdf->SectionTitle('Inspección');
$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, 'Fecha:', 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, date('d/m/Y H:i', strtotime($row['inspection_date'])), 0, 1);

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, utf8_decode('Técnico:'), 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, utf8_decode($row['tech_name'] ?: ''), 0, 1);

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, 'Estado:', 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->MultiCell(0, 6, utf8_decode($row['condition_status'] ?: ''));

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, 'Actividad:', 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->MultiCell(0, 6, utf8_decode($row['activity_level'] ?: ''));

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, utf8_decode('Acción:'), 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->MultiCell(0, 6, utf8_decode($row['action_taken'] ?: ''));

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, 'Cantidad:', 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, utf8_decode($row['amount_replenished'] ?: '-'), 0, 1);

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(30, 6, 'Notas:', 0, 0);
$pdf->SetFont('Arial', '', 10);
$pdf->MultiCell(0, 6, utf8_decode($row['notes'] ?: '-'));

$pdf->Ln(3);

$evidence_url = $row['evidence_photo_url'] ?? '';
if ($evidence_url) {
    $relative = $evidence_url;
    if (strpos($relative, 'api/') === 0) {
        $relative = substr($relative, 4);
    }
    $relative = ltrim($relative, '/');
    $filePath = __DIR__ . '/' . $relative;
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

    $pdf->SectionTitle('Evidencia');

    if (is_file($filePath) && in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
        $y = $pdf->GetY();
        $pdf->Image($filePath, 10, $y, 120);
        $pdf->Ln(80);
    } else {
        $pdf->SetFont('Arial', '', 10);
        $pdf->MultiCell(0, 6, utf8_decode('Evidencia disponible, pero no se puede incrustar en el PDF.'));
    }
}

$conn->close();

header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="inspeccion_cebadero_' . $id . '.pdf"');
$pdf->Output('I');
?>

