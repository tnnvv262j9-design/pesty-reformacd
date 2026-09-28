<?php
// Deshabilitar errores para no corromper el PDF
ini_set('display_errors', 0);
error_reporting(0);

require_once 'db_connect.php';
require_once 'encryption_service.php';

$encryption = new EncryptionService();

// Cargar FPDF
$fpdf_path = '../fpdf/fpdf.php';
if (!file_exists($fpdf_path)) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Librería FPDF no encontrada.']);
    exit;
}
require_once $fpdf_path;

// Recibir datos
$input = file_get_contents("php://input");
$data = json_decode($input ?: '{}', true);

$service_id = $data['service_id'] ?? null;
$company_id = $data['company_id'] ?? null;
$folio = $data['folio'] ?? 'S' . rand(100, 999);
$validity_months = intval($data['validity'] ?? 1);
$sanitary_responsible = $data['sanitary_responsible'] ?? '';
$city_manual = $data['city'] ?? '';
$treated_areas_manual = $data['treated_areas'] ?? '';
$meters = $data['meters'] ?? '';
$observations = $data['observations'] ?? '';

if (!$service_id || !$company_id) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Faltan parámetros requeridos.']);
    exit;
}

// 1. Obtener datos del servicio
$stmt = $conn->prepare("SELECT s.*, c.full_name as client_name, c.address as client_address, t.name as tech_name 
                        FROM services s 
                        JOIN clients c ON s.client_id = c.id 
                        LEFT JOIN technicians t ON s.technician_id = t.id 
                        WHERE s.id = ?");
$stmt->bind_param("i", $service_id);
$stmt->execute();
$service = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$service) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Servicio no encontrado.']);
    exit;
}

// Desencriptar datos
$service['client_name'] = $encryption->decrypt($service['client_name']);
$service['client_address'] = $encryption->decrypt($service['client_address']);

// 2. Obtener datos de la empresa
$stmt = $conn->prepare("SELECT name, logo_url, sanitary_license, contact_address, contact_phone, brand_color FROM companies WHERE id = ?");
$stmt->bind_param("i", $company_id);
$stmt->execute();
$company = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (empty($company['brand_color'])) {
    $company['brand_color'] = '#34D399';
}

// 3. Obtener químicos usados
$chemicals = [];
$stmt = $conn->prepare("SELECT cu.*, ch.name, ch.concentration, ch.active_ingredient 
                        FROM chemical_usage cu 
                        JOIN chemicals ch ON cu.chemical_id = ch.id 
                        WHERE cu.service_id = ?");
$stmt->bind_param("i", $service_id);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $chemicals[] = $row;
}
$stmt->close();

// Helper para decodificar UTF-8 a ISO-8859-1 (FPDF)
function utf8($str) {
    if (is_null($str)) return '';
    if (function_exists('mb_convert_encoding')) {
        return mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8');
    } elseif (function_exists('iconv')) {
        return iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $str);
    }
    return utf8_decode($str);
}

// Hex to RGB
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

// Asegurar directorios
$base_upload_dir = '../uploads/certificates/';
if (!is_dir($base_upload_dir . 'generated/')) {
    @mkdir($base_upload_dir . 'generated/', 0777, true);
}

// --- GENERAR PDF ---
class CertificatePDF extends FPDF {
    public $brandRGB;

    function Header() {
        global $company;
        $this->brandRGB = hex2rgb($company['brand_color']);
        
        // --- FONDO DE ALTA CALIDAD (BORDES DECORATIVOS) ---
        $this->SetDrawColor($this->brandRGB[0], $this->brandRGB[1], $this->brandRGB[2]);
        $this->SetLineWidth(0.8);
        $this->Rect(5, 5, 200, 287, 'D'); // Borde principal
        $this->SetLineWidth(0.2);
        $this->Rect(7, 7, 196, 283, 'D'); // Borde decorativo interno

        // --- LOGO DIFUMINADO / MARCA DE AGUA EN EL CENTRO ---
        if (!empty($company['logo_url'])) {
            $logo_path = '../' . $company['logo_url'];
            if (file_exists($logo_path)) {
                $this->SetAlpha(0.08); // Efecto sutil (transparencia)
                $this->Image($logo_path, 55, 100, 100);
                $this->SetAlpha(1);
            }
        }

        // --- ENCABEZADO ---
        if (!empty($company['logo_url'])) {
            $logo_path = '../' . $company['logo_url'];
            if (file_exists($logo_path)) {
                $this->Image($logo_path, 15, 12, 35);
            }
        }

        $this->SetY(15);
        $this->SetX(55);
        $headerWidth = 100;
        
        $this->SetFont('Arial', 'B', 18);
        $this->SetTextColor($this->brandRGB[0], $this->brandRGB[1], $this->brandRGB[2]);
        $this->Cell($headerWidth, 10, utf8($company['name']), 0, 1, 'L');
        
        $this->SetX(55);
        $this->SetFont('Arial', '', 10);
        $this->SetTextColor(70, 70, 70);
        $this->MultiCell($headerWidth, 5, utf8($company['contact_address']), 0, 'L');
        
        $this->SetX(55);
        $this->Cell($headerWidth, 5, utf8('Tel: ' . $company['contact_phone']), 0, 1, 'L');
        
        if (!empty($company['sanitary_license'])) {
            $this->SetX(55);
            $this->SetFont('Arial', 'B', 10);
            $this->SetTextColor($this->brandRGB[0], $this->brandRGB[1], $this->brandRGB[2]);
            $this->Cell($headerWidth, 6, utf8('LICENCIA SANITARIA: ' . $company['sanitary_license']), 0, 1, 'L');
        }
        $this->Ln(10);
    }

    // Soporte para transparencia (para marca de agua)
    protected $extgstates = array();
    function SetAlpha($alpha, $bm='Normal') {
        $gs = $this->AddExtGState(array('ca'=>$alpha, 'CA'=>$alpha, 'BM'=>'/'.$bm));
        $this->_out(sprintf('/GS%d gs', $gs));
    }
    function AddExtGState($parms) {
        $n = count($this->extgstates)+1;
        $this->extgstates[$n]['parms'] = $parms;
        return $n;
    }
    function _putextgstates() {
        for($i=1;$i<=count($this->extgstates);$i++) {
            $this->_newobj();
            $this->extgstates[$i]['n'] = $this->n;
            $this->_put('<</Type /ExtGState');
            foreach($this->extgstates[$i]['parms'] as $k=>$v) $this->_put('/'.$k.' '.$v);
            $this->_put('>>');
            $this->_put('endobj');
        }
    }
    function _putresourcedict() {
        parent::_putresourcedict();
        $this->_put('/ExtGState <<');
        foreach($this->extgstates as $k=>$v) $this->_put('/GS'.$k.' '.$v['n'].' 0 R');
        $this->_put('>>');
    }
    function _putresources() {
        $this->_putextgstates();
        parent::_putresources();
    }

    function RoundedRect($x, $y, $w, $h, $r, $style = '', $angle = '1234') {
        $k = $this->k; $hp = $this->h;
        if($style=='F') $op='f'; elseif($style=='FD' || $style=='DF') $op='B'; else $op='S';
        $MyArc = 4/3 * (sqrt(2) - 1);
        $this->_out(sprintf('%.2F %.2F m',($x+$r)*$k,($hp-$y)*$k));
        $xc = $x+$w-$r; $yc = $y+$r;
        $this->_out(sprintf('%.2F %.2F l', $xc*$k,($hp-$y)*$k));
        if (strpos($angle, '2')===false) $this->_out(sprintf('%.2F %.2F l', ($x+$w)*$k,($hp-$y)*$k));
        else $this->_Arc($xc + $r*$MyArc, $yc - $r, $xc + $r, $yc - $r*$MyArc, $xc + $r, $yc);
        $xc = $x+$w-$r; $yc = $y+$h-$r;
        $this->_out(sprintf('%.2F %.2F l',($x+$w)*$k,($hp-$yc)*$k));
        if (strpos($angle, '3')===false) $this->_out(sprintf('%.2F %.2F l',($x+$w)*$k,($hp-($y+$h))*$k));
        else $this->_Arc($xc + $r, $yc + $r*$MyArc, $xc + $r*$MyArc, $yc + $r, $xc, $yc + $r);
        $xc = $x+$r; $yc = $y+$h-$r;
        $this->_out(sprintf('%.2F %.2F l',$xc*$k,($hp-($y+$h))*$k));
        if (strpos($angle, '4')===false) $this->_out(sprintf('%.2F %.2F l',($x)*$k,($hp-($y+$h))*$k));
        else $this->_Arc($xc - $r*$MyArc, $yc + $r, $xc - $r, $yc + $r*$MyArc, $xc - $r, $yc);
        $xc = $x+$r; $yc = $y+$r;
        $this->_out(sprintf('%.2F %.2F l',($x)*$k,($hp-$yc)*$k));
        if (strpos($angle, '1')===false) { $this->_out(sprintf('%.2F %.2F l',($x)*$k,($hp-$y)*$k)); $this->_out(sprintf('%.2F %.2F l',($x+$r)*$k,($hp-$y)*$k)); }
        else $this->_Arc($xc - $r, $yc - $r*$MyArc, $xc - $r*$MyArc, $yc - $r, $xc, $yc - $r);
        $this->_out($op);
    }
    function _Arc($x1, $y1, $x2, $y2, $x3, $y3) {
        $h = $this->h;
        $this->_out(sprintf('%.2F %.2F %.2F %.2F %.2F %.2F c ', $x1*$this->k, ($h-$y1)*$this->k, $x2*$this->k, ($h-$y2)*$this->k, $x3*$this->k, ($h-$y3)*$this->k));
    }

    function Footer() {
        $this->SetY(-20);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(150, 150, 150);
        $this->Cell(0, 10, utf8('Este documento es un certificado oficial de servicio de control de plagas emitido por ' . $GLOBALS['company']['name']), 0, 0, 'C');
    }
}

try {
    $pdf = new CertificatePDF('P', 'mm', 'A4');
    $pdf->brandRGB = hex2rgb($company['brand_color']);
    $pdf->AliasNbPages();
    $pdf->AddPage();

    // --- SECCIÓN FECHAS Y FOLIO ---
    $pdf->SetXY(155, 15);
    $pdf->SetFont('Arial', 'B', 14);
    $pdf->SetTextColor($pdf->brandRGB[0], $pdf->brandRGB[1], $pdf->brandRGB[2]);
    $pdf->Cell(40, 8, utf8('FOLIO: ' . $folio), 0, 1, 'R');

    $pdf->SetFont('Arial', '', 8);
    $pdf->SetTextColor(50, 50, 50);
    
    // Fecha Aplicación (Box)
    $pdf->SetXY(155, 25);
    $pdf->SetFillColor(245, 245, 245);
    $pdf->RoundedRect(155, 25, 40, 15, 2, 'F');
    $pdf->SetXY(155, 26);
    $pdf->Cell(40, 4, utf8('Fecha Aplicación'), 0, 1, 'C');
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetXY(155, 30);
    $pdf->Cell(40, 6, date('d / m / Y', strtotime($service['service_date'])), 0, 1, 'C');

    // Fecha Vencimiento (Box)
    $pdf->SetXY(155, 42);
    $pdf->RoundedRect(155, 42, 40, 15, 2, 'F');
    $pdf->SetFont('Arial', '', 8);
    $pdf->SetXY(155, 43);
    $pdf->Cell(40, 4, utf8('Fecha Vencimiento'), 0, 1, 'C');
    $expiry_date = date('Y-m-d', strtotime($service['service_date'] . " + $validity_months months"));
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetXY(155, 47);
    $pdf->Cell(40, 6, date('d / m / Y', strtotime($expiry_date)), 0, 1, 'C');

    $pdf->SetY(60);

    // --- BLOQUE 1: DATOS DEL CLIENTE (REDiseñado) ---
    $pdf->SetDrawColor($pdf->brandRGB[0], $pdf->brandRGB[1], $pdf->brandRGB[2]);
    $pdf->SetFillColor($pdf->brandRGB[0], $pdf->brandRGB[1], $pdf->brandRGB[2]);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(190, 8, utf8('  DATOS GENERALES DEL ESTABLECIMIENTO'), 0, 1, 'L', true);
    
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFillColor(255, 255, 255);
    $pdf->RoundedRect(10, 68, 190, 50, 0, 'D');

    $pdf->SetXY(15, 72);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(40, 7, utf8('Establecimiento:'), 0, 0);
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(135, 7, utf8($service['client_name']), 'B', 1);

    $pdf->SetX(15);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(65, 7, utf8('Propietario y/o representante legal:'), 0, 0);
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(110, 7, utf8($service['client_name']), 'B', 1);

    // DIRECCIÓN DINÁMICA (AJUSTE AUTOMÁTICO)
    $pdf->SetX(15);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(25, 7, utf8('Dirección:'), 0, 0);
    
    $addr = utf8($service['client_address']);
    $fontSize = 10;
    $pdf->SetFont('Arial', '', $fontSize);
    while($pdf->GetStringWidth($addr) > 150 && $fontSize > 7) {
        $fontSize -= 0.5;
        $pdf->SetFont('Arial', '', $fontSize);
    }
    $pdf->Cell(150, 7, $addr, 'B', 1);

    $pdf->SetX(15);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(30, 7, utf8('Ciudad/Estado:'), 0, 0);
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(145, 7, utf8($city_manual), 'B', 1);

    // --- BLOQUE 2: DETALLES TÉCNICOS ---
    $pdf->SetY(125);
    $pdf->SetFillColor($pdf->brandRGB[0], $pdf->brandRGB[1], $pdf->brandRGB[2]);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(190, 8, utf8('  DETALLES DEL TRATAMIENTO Y PRODUCTOS'), 0, 1, 'L', true);
    
    $pdf->SetTextColor(0, 0, 0);
    $pdf->RoundedRect(10, 133, 190, 45, 0, 'D');

    $pdf->SetXY(15, 137);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(35, 7, utf8('Áreas tratadas:'), 0, 0);
    $pdf->SetFont('Arial', '', 10);
    $areas = !empty($treated_areas_manual) ? $treated_areas_manual : ($service['areas'] ?? '');
    $pdf->Cell(100, 7, utf8($areas), 'B', 0);
    
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(20, 7, utf8('Superficie:'), 0, 0);
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(25, 7, utf8($meters . ' m2'), 'B', 1);

    $pdf->SetX(15);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(45, 7, utf8('Plagas a combatir:'), 0, 0);
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(130, 7, utf8($service['pests']), 'B', 1);

    // TABLA DE QUÍMICOS INTEGRADA
    if (!empty($chemicals)) {
        $pdf->SetY(158);
        $pdf->SetX(12);
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetFillColor(240, 240, 240);
        $pdf->Cell(60, 6, utf8('Producto'), 1, 0, 'C', true);
        $pdf->Cell(60, 6, utf8('Ingrediente Activo'), 1, 0, 'C', true);
        $pdf->Cell(30, 6, utf8('Concentración'), 1, 0, 'C', true);
        $pdf->Cell(36, 6, utf8('Dosis'), 1, 1, 'C', true);
        
        $pdf->SetFont('Arial', '', 8);
        foreach ($chemicals as $chem) {
            $pdf->SetX(12);
            $pdf->Cell(60, 5, utf8($chem['name']), 1, 0, 'L');
            $pdf->Cell(60, 5, utf8($chem['active_ingredient']), 1, 0, 'L');
            $pdf->Cell(30, 5, utf8($chem['concentration']), 1, 0, 'C');
            $pdf->Cell(36, 5, utf8($chem['quantity_used'] . ' ' . $chem['unit_used']), 1, 1, 'C');
        }
    }

    // --- LICENCIA SANITARIA DESTACADA ---
    if (!empty($company['sanitary_license'])) {
        $pdf->SetY(205);
        $pdf->SetFont('Arial', 'B', 16);
        $pdf->SetTextColor($pdf->brandRGB[0], $pdf->brandRGB[1], $pdf->brandRGB[2]);
        $pdf->Cell(0, 10, utf8('LICENCIA SANITARIA: ' . $company['sanitary_license']), 0, 1, 'C');
    }

    // --- FIRMAS ---
    $pdf->SetY(235);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetTextColor(0, 0, 0);
    
    // Responsable
    $pdf->Line(25, 255, 85, 255);
    $pdf->SetXY(25, 256);
    $pdf->Cell(60, 5, utf8('RESPONSABLE SANITARIO'), 0, 0, 'C');
    $pdf->SetXY(25, 261);
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(60, 5, utf8($sanitary_responsible), 0, 0, 'C');

    // Técnico
    $pdf->Line(125, 255, 185, 255);
    $pdf->SetXY(125, 256);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(60, 5, utf8('TÉCNICO APLICADOR'), 0, 0, 'C');
    $pdf->SetXY(125, 261);
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(60, 5, utf8($service['tech_name']), 0, 0, 'C');

    // Firma digital
    $report_data = json_decode($service['report_data'] ?? '{}', true);
    if (isset($report_data['techSignature']) && !empty($report_data['techSignature'])) {
        $tech_sig = '../' . $report_data['techSignature'];
        if (file_exists($tech_sig)) {
            $pdf->Image($tech_sig, 135, 235, 40);
        }
    }

    // --- OBSERVACIONES ---
    if (!empty($observations)) {
        $pdf->SetY(272);
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->SetTextColor($pdf->brandRGB[0], $pdf->brandRGB[1], $pdf->brandRGB[2]);
        $pdf->Cell(0, 5, utf8('Observaciones Adicionales:'), 0, 1);
        $pdf->SetFont('Arial', '', 8);
        $pdf->SetTextColor(80, 80, 80);
        $pdf->MultiCell(0, 4, utf8($observations), 0, 'L');
    }

    // Finalizar y guardar
    $filename = 'Certificado_' . $folio . '.pdf';
    $save_path = '../uploads/certificates/generated/' . $filename;
    $pdf->Output('F', $save_path);

    // Registro en DB
    $stmt = $conn->prepare("INSERT INTO generated_certificates (company_id, service_id, template_id, folio, validity_months, file_path, observations) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $temp_id_val = 0;
    $stmt->bind_param("iiisiss", $company_id, $service_id, $temp_id_val, $folio, $validity_months, $save_path, $observations);
    $stmt->execute();
    $stmt->close();

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    readfile($save_path);
    exit;

} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Error al generar PDF: ' . $e->getMessage()]);
}
?>
