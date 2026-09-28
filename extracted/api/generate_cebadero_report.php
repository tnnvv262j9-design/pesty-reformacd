<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once 'db_connect.php';

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
    die("Error: No se encontró la librería FPDF. Por favor instálala en la carpeta 'fpdf' en la raíz del proyecto.");
}

if (!isset($_GET['company_id']) || !isset($_GET['client_id']) || !isset($_GET['start_date']) || !isset($_GET['end_date'])) {
    die("Faltan parámetros.");
}

$company_id = intval($_GET['company_id']);
$client_id = intval($_GET['client_id']);
$start_date = $_GET['start_date'];
$end_date = $_GET['end_date'];

// Fetch Client Info
$stmt = $conn->prepare("SELECT full_name, address FROM clients WHERE id = ? AND company_id = ?");
$stmt->bind_param("ii", $client_id, $company_id);
$stmt->execute();
$client = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$client) die("Cliente no encontrado.");

// Fetch Company Info (Logo, Name, Colors)
$stmt = $conn->prepare("SELECT name, logo_url, brand_color FROM companies WHERE id = ?");
$stmt->bind_param("i", $company_id);
$stmt->execute();
$company_info = $stmt->get_result()->fetch_assoc();
$stmt->close();

$company_name = $company_info['name'] ?? 'Pesty Control';
$logo_url = $company_info['logo_url'] ?? '';
$brand_color = $company_info['brand_color'] ?? '#34D399';

// Fetch Inspections
$stmt = $conn->prepare("
    SELECT i.*, c.code, c.location, c.device_type, t.name as tech_name
    FROM cebadero_inspections i 
    JOIN cebaderos c ON i.cebadero_id = c.id 
    LEFT JOIN technicians t ON i.tech_id = t.id
    WHERE c.client_id = ? AND i.inspection_date BETWEEN ? AND ? 
    ORDER BY i.inspection_date DESC
");
$end_date_full = $end_date . " 23:59:59";
$stmt->bind_param("iss", $client_id, $start_date, $end_date_full);
$stmt->execute();
$result = $stmt->get_result();
$inspections = [];
while ($row = $result->fetch_assoc()) {
    $inspections[] = $row;
}
$stmt->close();

class PDF extends FPDF {
    public $company_name;
    public $report_title = "Reporte de Cebaderos";
    public $logo_url;
    public $brand_color_rgb;

    function hex2rgb($hex) {
        $hex = str_replace("#", "", $hex);
        if(strlen($hex) == 3) {
            $r = hexdec(substr($hex,0,1).substr($hex,0,1));
            $g = hexdec(substr($hex,1,1).substr($hex,1,1));
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
    
    function SetBrandDrawColor() {
        if(isset($this->brand_color_rgb)) {
            $this->SetDrawColor($this->brand_color_rgb[0], $this->brand_color_rgb[1], $this->brand_color_rgb[2]);
        }
    }

    function Header() {
        // Logo
        if ($this->logo_url && file_exists(__DIR__ . '/../' . $this->logo_url)) {
            $this->Image(__DIR__ . '/../' . $this->logo_url, 170, 8, 30);
        } else {
             // Debug text if logo not found (optional, removed for production)
        }

        // Title
        $this->SetFont('Arial', 'B', 20);
        $this->Cell(0, 10, utf8_decode($this->report_title), 0, 1, 'L');
        
        // Subtitle (Company Name)
        $this->SetFont('Arial', 'B', 12);
        $this->SetTextColor(100, 100, 100);
        $this->Cell(0, 6, utf8_decode($this->company_name), 0, 1, 'L');
        
        // Date
        $this->SetFont('Arial', '', 10);
        $this->Cell(0, 6, 'Fecha de Emision: ' . date('d/m/Y'), 0, 1, 'L');
        
        // Line Separator
        $this->Ln(5);
        $this->SetBrandDrawColor();
        $this->SetLineWidth(0.5);
        $this->Line(10, $this->GetY(), 200, $this->GetY());
        $this->Ln(10);
        
        // Reset Text Color
        $this->SetTextColor(0, 0, 0);
    }
    
    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(128);
        $this->Cell(0, 10, utf8_decode('Página ') . $this->PageNo() . '/{nb} - ' . utf8_decode($this->company_name), 0, 0, 'C');
    }

    function SectionTitle($label) {
        $this->SetFont('Arial', 'B', 12);
        $this->SetBrandColor();
        $this->Cell(0, 6, utf8_decode($label), 0, 1, 'L');
        $this->Ln(2);
        
        // Underline
        $this->SetBrandDrawColor();
        $this->SetLineWidth(0.5);
        $this->Line($this->GetX(), $this->GetY(), $this->GetX() + 30, $this->GetY()); // Short underline like in example
        $this->Ln(5);
        
        // Reset
        $this->SetTextColor(0);
    }
}

$pdf = new PDF();
$pdf->company_name = $company_name;
$pdf->logo_url = $logo_url;
$pdf->brand_color_rgb = $pdf->hex2rgb($brand_color);

$pdf->AliasNbPages();
$pdf->AddPage();

// 1. Datos del Cliente
$pdf->SectionTitle('Datos del Cliente');

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(25, 6, 'Cliente:', 0);
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, utf8_decode($client['full_name']), 0, 1);

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(25, 6, utf8_decode('Dirección:'), 0);
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, utf8_decode($client['address']), 0, 1);

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(25, 6, 'Periodo:', 0);
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, date('d/m/Y', strtotime($start_date)) . ' al ' . date('d/m/Y', strtotime($end_date)), 0, 1);
$pdf->Ln(8);

// 2. Resumen de Inspecciones
$pdf->SectionTitle('Resumen de Inspecciones');

// Table Header
$pdf->SetFillColor(245, 245, 245);
$pdf->SetTextColor(0);
$pdf->SetDrawColor(220, 220, 220);
$pdf->SetLineWidth(0.2);
$pdf->SetFont('Arial', 'B', 8);

$w = array(25, 20, 35, 20, 25, 35, 30); // Column widths

$pdf->Cell($w[0], 8, 'Fecha', 1, 0, 'C', true);
$pdf->Cell($w[1], 8, 'ID', 1, 0, 'C', true);
$pdf->Cell($w[2], 8, utf8_decode('Ubicación'), 1, 0, 'C', true);
$pdf->Cell($w[3], 8, 'Estado', 1, 0, 'C', true);
$pdf->Cell($w[4], 8, 'Actividad', 1, 0, 'C', true);
$pdf->Cell($w[5], 8, utf8_decode('Acción'), 1, 0, 'C', true);
$pdf->Cell($w[6], 8, utf8_decode('Técnico'), 1, 1, 'C', true);

// Table Rows
$pdf->SetFont('Arial', '', 8);
$fill = false;

foreach ($inspections as $insp) {
    $date = date('d/m/Y H:i', strtotime($insp['inspection_date']));
    
    // Check height to prevent page break inside row
    if ($pdf->GetY() > 270) {
        $pdf->AddPage();
        // Reprint Header
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetFillColor(245, 245, 245);
        $pdf->Cell($w[0], 8, 'Fecha', 1, 0, 'C', true);
        $pdf->Cell($w[1], 8, 'ID', 1, 0, 'C', true);
        $pdf->Cell($w[2], 8, utf8_decode('Ubicación'), 1, 0, 'C', true);
        $pdf->Cell($w[3], 8, 'Estado', 1, 0, 'C', true);
        $pdf->Cell($w[4], 8, 'Actividad', 1, 0, 'C', true);
        $pdf->Cell($w[5], 8, utf8_decode('Acción'), 1, 0, 'C', true);
        $pdf->Cell($w[6], 8, utf8_decode('Técnico'), 1, 1, 'C', true);
        $pdf->SetFont('Arial', '', 8);
    }

    $pdf->Cell($w[0], 7, $date, 1, 0, 'C', $fill);
    $pdf->Cell($w[1], 7, utf8_decode($insp['code']), 1, 0, 'C', $fill);
    $pdf->Cell($w[2], 7, utf8_decode(substr($insp['location'], 0, 22)), 1, 0, 'L', $fill); 
    
    // Status Logic for cleaner text
    $status = $insp['condition_status']; // Assuming comma separated or simple string
    $pdf->Cell($w[3], 7, utf8_decode(substr($status, 0, 15)), 1, 0, 'C', $fill);
    
    $pdf->Cell($w[4], 7, utf8_decode($insp['activity_level']), 1, 0, 'C', $fill);
    $pdf->Cell($w[5], 7, utf8_decode(substr($insp['action_taken'], 0, 22)), 1, 0, 'L', $fill);
    $pdf->Cell($w[6], 7, utf8_decode(substr($insp['tech_name'], 0, 18)), 1, 1, 'L', $fill);
    
    // $fill = !$fill; // Alternate rows if desired
}

if (count($inspections) == 0) {
    $pdf->Cell(array_sum($w), 10, 'No se encontraron inspecciones en este periodo.', 1, 1, 'C');
}

$pdf->Output('I', 'Reporte_Cebaderos.pdf');
?>