<?php
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0); // Suppress deprecation warnings to avoid breaking PDF output

require_once 'db_connect.php';

// Helper function to replace deprecated utf8_decode
function safe_decode($str) {
    if (is_null($str)) return '';
    // FPDF expects ISO-8859-1 (Latin-1)
    if (function_exists('mb_convert_encoding')) {
        return mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8');
    } elseif (function_exists('iconv')) {
        return iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $str);
    }
    // Fallback if no conversion functions (might result in garbled text for non-ascii)
    return $str;
}

// FPDF Library Path - Check multiple possible locations
$fpdf_paths = [
    '../fpdf/fpdf.php',           // Standard relative path
    '../../fpdf/fpdf.php',        // Nested deeper
    'fpdf/fpdf.php',              // Inside api/fpdf
    '../lib/fpdf/fpdf.php',       // In lib folder
    __DIR__ . '/../fpdf/fpdf.php' // Absolute path
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
    die("Error: No se encontró la librería FPDF.");
}

if (!isset($_GET['id'])) {
    die("Faltan parámetros (ID de servicio).");
}

$service_id = intval($_GET['id']);

// --- FETCH SERVICE DATA ---
$stmt = $conn->prepare("SELECT s.*, c.full_name as client_name, c.address as client_address, c.phone as client_phone, t.name as tech_name 
                        FROM services s 
                        JOIN clients c ON s.client_id = c.id 
                        LEFT JOIN technicians t ON s.technician_id = t.id 
                        WHERE s.id = ?");
$stmt->bind_param("i", $service_id);
$stmt->execute();
$service = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$service) die("Servicio no encontrado.");

$company_id = $service['company_id'];
$report_data = json_decode($service['report_data'] ?? '{}', true);

// --- FETCH COMPANY DATA ---
$stmt = $conn->prepare("SELECT name, logo_url, brand_color, sanitary_license, report_footer_text FROM companies WHERE id = ?");
$stmt->bind_param("i", $company_id);
$stmt->execute();
$company_info = $stmt->get_result()->fetch_assoc();
$stmt->close();

$company_name = $company_info['name'] ?? 'Pesty Software';
$logo_url = $company_info['logo_url'] ?? '';
$brand_color = $company_info['brand_color'] ?? '#34D399';
$sanitary_license = $company_info['sanitary_license'] ?? '';
$report_footer_text = $company_info['report_footer_text'] ?? '';

// --- PDF CLASS ---
class PDF extends FPDF {
    public $company_name;
    public $logo_url;
    public $brand_color_rgb;
    public $sanitary_license;
    public $service_id;
    public $folio;

    function hex2rgb($hex) {
        $hex = str_replace("#", "", $hex);
        if(strlen($hex) == 3) {
            $r = hexdec(substr($hex,0,1).substr($hex,0,1));
            $g = hexdec(substr($hex,1,1).substr($hex,1,1);
            $b = hexdec(substr($hex,2,1).substr($hex,2,1));
        } else {
            $r = hexdec(substr($hex,0,2));
            $g = hexdec(substr($hex,2,2));
            $b = hexdec(substr($hex,4,2));
        }
        return array($r, $g, $b);
    }

    function SetBrandColor() {
        if(isset($this->brand_color_rgb)) {
            $this->SetTextColor($this->brand_color_rgb[0], $this->brand_color_rgb[1], $this->brand_color_rgb[2]);
        }
    }

    function Header() {
        // Logo (top right)
        if ($this->logo_url && file_exists(__DIR__ . '/../' . $this->logo_url)) {
            $this->Image(__DIR__ . '/../' . $this->logo_url, 160, 10, 40);
        }

        // Title "REPORTE DE SERVICIO" (green, large)
        $this->SetFont('Arial', 'B', 24);
        $this->SetBrandColor();
        $this->Cell(0, 12, safe_decode('REPORTE DE SERVICIO'), 0, 1, 'L');
        $this->SetTextColor(0); // reset to black

        // Folio
        $this->SetFont('Arial', '', 10);
        $this->Cell(0, 5, safe_decode('Folio: #' . $this->folio), 0, 1, 'L');

        // Sanitary License if exists
        if ($this->sanitary_license) {
            $this->SetFont('Arial', '', 9);
            $this->Cell(0, 5, safe_decode('Licencia Sanitaria: ' . $this->sanitary_license), 0, 1, 'L');
        }

        // Powered by Pesty Software
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(128);
        $this->Cell(0, 4, safe_decode('Powered by Pesty Software'), 0, 1, 'L');
        $this->SetTextColor(0);

        // Horizontal line (green)
        $this->Ln(3);
        $this->SetBrandColor();
        $this->SetLineWidth(2);
        $this->Line(10, $this->GetY(), 200, $this->GetY());
        $this->Ln(8);
    }

    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(128);
        $this->Cell(0, 10, safe_decode('Página ') . $this->PageNo() . '/{nb} - ' . safe_decode($this->company_name), 0, 0, 'C');
    }

    function SectionTitle($label) {
        $this->SetFont('Arial', 'B', 14);
        $this->SetTextColor(0);
        // Green vertical bar on the left
        $this->SetBrandColor();
        $this->SetFillColor($this->brand_color_rgb[0], $this->brand_color_rgb[1], $this->brand_color_rgb[2]);
        $this->Rect(10, $this->GetY(), 4, 14, 'F');
        // Label next to bar
        $this->SetX(18);
        $this->Cell(0, 14, safe_decode($label), 0, 1, 'L');
        $this->SetTextColor(0);

        // Small underline with two colors: green and yellow
        $this->SetLineWidth(1.5);
        $x = 18;
        $w1 = 25;
        $w2 = 25;
        $this->SetBrandColor();
        $this->Line($x, $this->GetY(), $x + $w1, $this->GetY());
        $this->SetDrawColor(250, 204, 21); // Yellow
        $this->Line($x + $w1, $this->GetY(), $x + $w1 + $w2, $this->GetY());
        $this->SetDrawColor(0);
        $this->SetLineWidth(0.2);

        $this->Ln(5);
    }

    function InfoBox($key, $value, $bg = [245, 245, 245]) {
        $this->SetFillColor($bg[0], $bg[1], $bg[2]);
        $this->SetDrawColor(220, 220, 220);
        $this->SetFont('Arial', 'B', 9);
        $this->SetTextColor(100);
        $this->Cell(0, 5, safe_decode($key), 0, 1, 'L');
        $this->SetFont('Arial', '', 10);
        $this->SetTextColor(0);
        $this->MultiCell(0, 6, safe_decode($value), 0, 'L');
    }
}

// Folio Generation (Initials + ID)
$companyInitials = '';
$words = explode(' ', $company_name);
foreach($words as $w) { $companyInitials .= strtoupper(substr($w, 0, 1)); }
$companyInitials = substr($companyInitials, 0, 3) ?: 'PST';
$folio = $companyInitials . '-' . str_pad($service_id, 4, '0', STR_PAD_LEFT);

$pdf = new PDF();
$pdf->company_name = $company_name;
$pdf->logo_url = $logo_url;
$pdf->brand_color_rgb = $pdf->hex2rgb($brand_color);
$pdf->sanitary_license = $sanitary_license;
$pdf->folio = $folio;

$pdf->AliasNbPages();
$pdf->AddPage();

// 1. Datos del Cliente y Servicio
$pdf->SectionTitle('Datos del Cliente y Servicio');

// Client info box
$pdf->SetFillColor(245, 245, 245);
$pdf->SetDrawColor(220, 220, 220);
$pdf->Rect(10, $pdf->GetY(), 190, 45, 'DF');
$pdf->SetXY(12, $pdf->GetY() + 2);

// Cliente
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(40, 6, safe_decode('Cliente:'), 0, 0, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->Cell(0, 6, safe_decode($service['client_name']), 0, 1, 'L');

// Fecha
$pdf->SetXY(120, $pdf->GetY() - 6);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(40, 6, safe_decode('Fecha:'), 0, 0, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->Cell(0, 6, safe_decode(date('d/m/Y', strtotime($service['service_date']))), 0, 1, 'L');

// Dirección
$pdf->SetXY(12, $pdf->GetY() + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(40, 6, safe_decode('Dirección:'), 0, 0, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell(170, 6, safe_decode($service['client_address']), 0, 'L');

$currentY = $pdf->GetY();
// Técnico
$pdf->SetXY(120, $currentY - 12);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(40, 6, safe_decode('Técnico:'), 0, 0, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->Cell(0, 6, safe_decode($service['tech_name'] ?? 'N/A'), 0, 1, 'L');

// Contacto en sitio
$pdf->SetXY(12, $currentY + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(60, 6, safe_decode('Contacto en sitio:'), 0, 0, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->Cell(0, 6, safe_decode($report_data['clientContact'] ?? 'N/A'), 0, 1, 'L');

// Duración del servicio
$pdf->SetXY(120, $currentY + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(60, 6, safe_decode('Duración del servicio:'), 0, 0, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->Cell(0, 6, safe_decode(($report_data['serviceDuration'] ?? 'N/A') . ' min'), 0, 1, 'L');

$pdf->SetY($currentY + 14);
$pdf->Ln(10);

// 3. Diagnóstico Negocio Local
$pdf->SectionTitle('3. Diagnóstico Negocio Local');

// Áreas inspeccionadas
$pdf->SetFillColor(245, 245, 245);
$pdf->SetDrawColor(220, 220, 220);
$pdf->Rect(10, $pdf->GetY(), 190, 18, 'DF');
$pdf->SetXY(12, $pdf->GetY() + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(60, 6, safe_decode('Áreas inspeccionadas:'), 0, 0, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell(165, 6, safe_decode($report_data['affectedAreas'] ?? $report_data['localAreas'] ?? 'No especificado'), 0, 'L');
$pdf->Ln(3);

// Método de inspección and Detalle de actividad
$xStart = 10;
$yStart = $pdf->GetY();
// Left box
$pdf->Rect($xStart, $yStart, 90, 20, 'DF');
$pdf->SetXY($xStart + 2, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(85, 5, safe_decode('Método de inspección:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell(85, 6, safe_decode($report_data['inspectionMethod'] ?? $report_data['localInspectionMethod'] ?? 'Inspección visual'), 0, 'L');
// Right box
$pdf->SetXY($xStart + 100, $yStart);
$pdf->Rect($xStart + 100, $yStart, 90, 20, 'DF');
$pdf->SetXY($xStart + 102, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(85, 5, safe_decode('Detalle de actividad:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell(85, 6, safe_decode($report_data['activityDetail'] ?? $report_data['localActivityDetail'] ?? ''), 0, 'L');
$pdf->SetY($yStart + 24);
$pdf->Ln(3);

// Plagas detectadas and Nivel de infestación
$xStart = 10;
$yStart = $pdf->GetY();
// Left box
$pdf->Rect($xStart, $yStart, 90, 20, 'DF');
$pdf->SetXY($xStart + 2, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(85, 5, safe_decode('Plagas detectadas:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell(85, 6, safe_decode($report_data['detectedPests'] ?? $report_data['localPests'] ?? 'Ninguna'), 0, 'L');
// Right box
$pdf->SetXY($xStart + 100, $yStart);
$pdf->Rect($xStart + 100, $yStart, 90, 20, 'DF');
$pdf->SetXY($xStart + 102, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(85, 5, safe_decode('Nivel de infestación:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell(85, 6, safe_decode($report_data['infestationLevel'] ?? $report_data['localInfestationLevel'] ?? 'Nulo'), 0, 'L');
$pdf->SetY($yStart + 24);
$pdf->Ln(10);

// 4. Estrategia de Control
$pdf->SectionTitle('4. Estrategia de Control');

// Three boxes: Tipo de tratamiento, Motivo del tratamiento, Métodos de aplicación
$xStart = 10;
$yStart = $pdf->GetY();
$boxWidth = 60;
$boxHeight = 22;
$gap = 5;

// Box 1
$pdf->Rect($xStart, $yStart, $boxWidth, $boxHeight, 'DF');
$pdf->SetXY($xStart + 2, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell($boxWidth - 4, 5, safe_decode('Tipo de tratamiento:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell($boxWidth - 4, 6, safe_decode($report_data['treatmentType'] ?? $report_data['localTreatmentType'] ?? 'Preventivo'), 0, 'L');

// Box 2
$pdf->SetXY($xStart + $boxWidth + $gap, $yStart);
$pdf->Rect($xStart + $boxWidth + $gap, $yStart, $boxWidth, $boxHeight, 'DF');
$pdf->SetXY($xStart + $boxWidth + $gap + 2, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell($boxWidth - 4, 5, safe_decode('Motivo del tratamiento:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell($boxWidth - 4, 6, safe_decode($report_data['treatmentReason'] ?? $report_data['localTreatmentReason'] ?? ''), 0, 'L');

// Box 3
$pdf->SetXY($xStart + ($boxWidth + $gap)*2, $yStart);
$pdf->Rect($xStart + ($boxWidth + $gap)*2, $yStart, $boxWidth, $boxHeight, 'DF');
$pdf->SetXY($xStart + ($boxWidth + $gap)*2 + 2, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell($boxWidth - 4, 5, safe_decode('Métodos de aplicación:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell($boxWidth - 4, 6, safe_decode($report_data['treatmentMethod'] ?? $report_data['localTreatmentMethod'] ?? 'Cebos'), 0, 'L');

$pdf->SetY($yStart + $boxHeight + 8);
$pdf->Ln(5);

// Uso de Químicos
if (isset($report_data['chemicals']) && is_array($report_data['chemicals']) && count($report_data['chemicals']) > 0) {
    $pdf->SectionTitle('Uso de Químicos');

    // Table Header
    $pdf->SetFillColor(240, 240, 240);
    $pdf->SetFont('Arial', 'B', 9);
    $pdf->Cell(150, 8, safe_decode('Químico'), 1, 0, 'L', true);
    $pdf->Cell(40, 8, safe_decode('Cantidad'), 1, 1, 'R', true);

    $pdf->SetFont('Arial', '', 9);
    foreach ($report_data['chemicals'] as $chem) {
        $name = $chem['name'] ?? $chem['chemical_name'] ?? 'Químico';
        $ingredient = $chem['active_ingredient'] ?? '';
        $rsco = $chem['rsco'] ?? '';
        $qty = $chem['quantity'] ?? 0;
        $unit = $chem['unit'] ?? 'ml';

        $details = $name;
        if ($ingredient) $details .= " | Ingrediente: $ingredient";
        if ($rsco) $details .= " | Registro: $rsco";

        $pdf->Cell(150, 7, safe_decode($details), 1, 0, 'L');
        $pdf->Cell(40, 7, $qty . ' ' . $unit, 1, 1, 'R');
    }
    $pdf->Ln(5);
}

// 7. Evidencia y Observaciones
$pdf->SectionTitle('7. Evidencia y Observaciones');

// First row: Condiciones detectadas and Riesgos sanitarios observados
$xStart = 10;
$yStart = $pdf->GetY();
$boxWidth = 90;
$boxHeight = 20;
$gap = 10;

// Box 1
$pdf->Rect($xStart, $yStart, $boxWidth, $boxHeight, 'DF');
$pdf->SetXY($xStart + 2, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell($boxWidth - 4, 5, safe_decode('Condiciones detectadas:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell($boxWidth - 4, 6, safe_decode($report_data['conditions'] ?? $report_data['localConditions'] ?? 'Ninguna'), 0, 'L');

// Box 2
$pdf->SetXY($xStart + $boxWidth + $gap, $yStart);
$pdf->Rect($xStart + $boxWidth + $gap, $yStart, $boxWidth, $boxHeight, 'DF');
$pdf->SetXY($xStart + $boxWidth + $gap + 2, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell($boxWidth - 4, 5, safe_decode('Riesgos sanitarios observados:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell($boxWidth - 4, 6, safe_decode($report_data['sanitaryRisks'] ?? $report_data['localSanitaryRisks'] ?? 'Ninguna'), 0, 'L');

$pdf->SetY($yStart + $boxHeight + 3);

// Second row: Acciones recomendadas and Observaciones de limpieza
$xStart = 10;
$yStart = $pdf->GetY();

// Box 1
$pdf->Rect($xStart, $yStart, $boxWidth, $boxHeight, 'DF');
$pdf->SetXY($xStart + 2, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell($boxWidth - 4, 5, safe_decode('Acciones recomendadas:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell($boxWidth - 4, 6, safe_decode($report_data['recommendedActions'] ?? $report_data['localRecommendedActions'] ?? 'Ninguna'), 0, 'L');

// Box 2
$pdf->SetXY($xStart + $boxWidth + $gap, $yStart);
$pdf->Rect($xStart + $boxWidth + $gap, $yStart, $boxWidth, $boxHeight, 'DF');
$pdf->SetXY($xStart + $boxWidth + $gap + 2, $yStart + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell($boxWidth - 4, 5, safe_decode('Observaciones de limpieza:'), 0, 1, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell($boxWidth - 4, 6, safe_decode($report_data['cleaningObservations'] ?? $report_data['localCleaningObservations'] ?? 'Ninguna'), 0, 'L');

$pdf->SetY($yStart + $boxHeight + 3);

// Third row: Mantenimiento (full width)
$pdf->Rect(10, $pdf->GetY(), 190, 20, 'DF');
$pdf->SetXY(12, $pdf->GetY() + 2);
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(60, 5, safe_decode('Mantenimiento:'), 0, 0, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$pdf->MultiCell(170, 6, safe_decode($report_data['maintenance'] ?? $report_data['localMaintenance'] ?? 'Ninguna'), 0, 'L');
$pdf->Ln(10);

// Notas del Servicio
$pdf->SectionTitle('Notas del Servicio');
if (!empty($service['notes'])) {
    $pdf->SetFillColor(245, 245, 245);
    $pdf->SetDrawColor(220, 220, 220);
    $pdf->Rect(10, $pdf->GetY(), 190, 20, 'DF');
    $pdf->SetXY(12, $pdf->GetY() + 2);
    $pdf->SetFont('Arial', '', 10);
    $pdf->MultiCell(186, 6, safe_decode($service['notes']), 0, 'L');
} else {
    // Show reinforcement note if applicable
    $reinforcementNote = '';
    if (!empty($report_data['isRefuerzo'])) {
        $reinforcementNote = 'Servicio de refuerzo basado en el servicio #' . ($report_data['originalServiceId'] ?? 'undefined') . '. Notas originales: ' . ($report_data['originalNotes'] ?? '');
    }
    if ($reinforcementNote) {
        $pdf->SetFillColor(245, 245, 245);
        $pdf->SetDrawColor(220, 220, 220);
        $pdf->Rect(10, $pdf->GetY(), 190, 20, 'DF');
        $pdf->SetXY(12, $pdf->GetY() + 2);
        $pdf->SetFont('Arial', '', 10);
        $pdf->MultiCell(186, 6, safe_decode($reinforcementNote), 0, 'L');
    }
}
$pdf->Ln(10);

// Garantía y Seguimiento
$pdf->SectionTitle('Garantía y Seguimiento');

$pdf->SetFillColor(245, 245, 245);
$pdf->SetDrawColor(220, 220, 220);
$pdf->Rect(10, $pdf->GetY(), 190, 25, 'DF');
$pdf->SetXY(12, $pdf->GetY() + 2);

// Garantía del servicio
$pdf->SetFont('Arial', 'B', 9);
$pdf->SetTextColor(100);
$pdf->Cell(60, 6, safe_decode('Garantía del servicio:'), 0, 0, 'L');
$pdf->SetFont('Arial', '', 10);
$pdf->SetTextColor(0);
$warranty = ($report_data['appliesWarranty'] ?? 'no') === 'si' ? 'Sí, duración: ' . ($report_data['warrantyDuration'] ?? '') : 'No aplica';
$pdf->Cell(0, 6, safe_decode($warranty), 0, 1, 'L');

// Próximo refuerzo (if applicable)
if (!empty($service['reinforcement_days'])) {
    $pdf->SetXY(12, $pdf->GetY() + 2);
    $pdf->SetFont('Arial', 'B', 9);
    $pdf->SetTextColor(100);
    $pdf->Cell(60, 6, safe_decode('Próximo refuerzo:'), 0, 0, 'L');
    $pdf->SetFont('Arial', '', 10);
    $pdf->SetTextColor(0);
    $nextDate = date('d/m/Y', strtotime($service['service_date'] . ' + ' . $service['reinforcement_days'] . ' days'));
    $pdf->Cell(0, 6, safe_decode("Se recomienda realizar el servicio en $nextDate"), 0, 1, 'L');
}
$pdf->SetY($pdf->GetY() + 8);
$pdf->Ln(10);

// Recomendaciones
if ($pdf->GetY() > 200) {
    $pdf->AddPage();
}
$pdf->SectionTitle('Recomendaciones');

// Pink box for Recomendaciones de Seguridad
$pdf->SetFillColor(255, 242, 242);
$pdf->SetDrawColor(255, 202, 202);
$pdf->Rect(15, $pdf->GetY(), 180, 30, 'DF');
$pdf->SetXY(17, $pdf->GetY() + 2);
$pdf->SetFont('Arial', 'B', 10);
$pdf->SetTextColor(220, 38, 38);
$pdf->Cell(0, 6, safe_decode('Recomendaciones de Seguridad'), 0, 1, 'C');
$pdf->SetFont('Arial', '', 9);
$pdf->SetTextColor(127, 29, 29);
$safety = $report_data['safetyRecommendations'] ?? $report_data['localSafetyRecommendations'] ?? '';
if (!empty($safety) && trim($safety)) {
    // Split safety text into lines
    $lines = explode("\n", $safety);
    foreach ($lines as $line) {
        if (trim($line)) {
            $clean_line = preg_replace('/^\d+\.?-?\s*/', '', trim($line));
            $pdf->MultiCell(176, 5, safe_decode($clean_line), 0, 'L');
        }
    }
} else {
    // Add some space to keep the box height
    $pdf->Ln(5);
}
$pdf->SetY($pdf->GetY() + 10);

// Fotos Después del Servicio (and Antes if available)
$photos_before = $report_data['photos_before'] ?? [];
$photos_after = $report_data['photos_after'] ?? [];

// Compatibility with old format where photos might be mixed in 'photos'
if (empty($photos_before) && empty($photos_after) && !empty($report_data['photos'])) {
    $photos_before = $report_data['photos']; // Treat all as generic if not separated
}

if (!empty($photos_before) || !empty($photos_after)) {
    if (!empty($photos_after)) {
        // Force a new page for photos to avoid cutting off
        $pdf->AddPage();
        $pdf->SectionTitle('Fotos Después del Servicio');

        $x_start = 10;
        $y_start = $pdf->GetY() + 5; // Add a little extra space after title
        $w_img = 60;
        $h_img = 50; // Slightly larger images
        $gap = 8;

        foreach ($photos_after as $index => $photo) {
            $path = __DIR__ . '/../' . $photo;
            if (file_exists($path)) {
                // Check if we need a new row
                if ($x_start + $w_img > 200) {
                    $x_start = 10;
                    $y_start += $h_img + $gap;
                }

                // Check if we need a new page (more conservative)
                if ($y_start + $h_img > 265) {
                    $pdf->AddPage();
                    $y_start = 20;
                    $x_start = 10;
                }

                $pdf->Image($path, $x_start, $y_start, $w_img, $h_img);
                $x_start += $w_img + $gap;
            }
        }
        $pdf->SetY($y_start + $h_img + 15);
    }

    if (!empty($photos_before)) {
        // Start a new page for before photos
        $pdf->AddPage();
        $pdf->SectionTitle('Fotos Antes del Servicio');

        $x_start = 10;
        $y_start = $pdf->GetY() + 5; // Add a little extra space after title
        $w_img = 60;
        $h_img = 50; // Slightly larger images
        $gap = 8;

        foreach ($photos_before as $photo) {
            $path = __DIR__ . '/../' . $photo;
            if (file_exists($path)) {
                // Check if we need a new row
                if ($x_start + $w_img > 200) {
                    $x_start = 10;
                    $y_start += $h_img + $gap;
                }

                // Check if we need a new page (more conservative)
                if ($y_start + $h_img > 265) {
                    $pdf->AddPage();
                    $y_start = 20;
                    $x_start = 10;
                }

                $pdf->Image($path, $x_start, $y_start, $w_img, $h_img);
                $x_start += $w_img + $gap;
            }
        }
        $pdf->SetY($y_start + $h_img + 15);
    }
}

// Firma de Conformidad
if ($pdf->GetY() > 180) {
    $pdf->AddPage();
}
$pdf->SectionTitle('Firma de Conformidad');

$y_signatures = $pdf->GetY();

// Signature boxes
$pdf->SetDrawColor(200);
$pdf->SetLineWidth(0.5);
$pdf->SetLineStyle(['dash' => 3]);
$pdf->Rect(15, $y_signatures, 80, 40, 'D');
$pdf->Rect(115, $y_signatures, 80, 40, 'D');
$pdf->SetLineStyle(['dash' => 0]);
$pdf->SetLineWidth(0.2);
$pdf->SetDrawColor(0);

// Insert signatures
if (!empty($report_data['techSignature'])) {
    $sigPath = __DIR__ . '/../' . $report_data['techSignature'];
    if (file_exists($sigPath)) {
        $pdf->Image($sigPath, 20, $y_signatures + 2, 70, 36);
    }
} else {
    $pdf->SetXY(15, $y_signatures + 15);
    $pdf->SetFont('Arial', 'I', 10);
    $pdf->SetTextColor(128);
    $pdf->Cell(80, 10, safe_decode('(Sin firma)'), 0, 0, 'C');
}

if (!empty($report_data['clientSignature'])) {
    $sigPath = __DIR__ . '/../' . $report_data['clientSignature'];
    if (file_exists($sigPath)) {
        $pdf->Image($sigPath, 120, $y_signatures + 2, 70, 36);
    }
} else {
    $pdf->SetXY(115, $y_signatures + 15);
    $pdf->SetFont('Arial', 'I', 10);
    $pdf->SetTextColor(128);
    $pdf->Cell(80, 10, safe_decode('(Sin firma)'), 0, 0, 'C');
}

// Labels
$pdf->SetTextColor(0);
$pdf->SetFont('Arial', '', 9);
$pdf->SetXY(15, $y_signatures + 43);
$pdf->Cell(80, 6, safe_decode('Firma del Técnico'), 0, 0, 'C');
$pdf->SetXY(115, $y_signatures + 43);
$pdf->Cell(80, 6, safe_decode('Firma del Cliente'), 0, 1, 'C');

// Small "Firmado digitalmente" under boxes
$pdf->SetFont('Arial', 'I', 7);
$pdf->SetTextColor(160);
$pdf->SetXY(15, $y_signatures + 38);
$pdf->Cell(80, 4, safe_decode('Firmado digitalmente'), 0, 0, 'C');
$pdf->SetXY(115, $y_signatures + 38);
$pdf->Cell(80, 4, safe_decode('Firmado digitalmente'), 0, 1, 'C');

$pdf->Output('I', 'Reporte_Servicio_' . $folio . '.pdf');
?>