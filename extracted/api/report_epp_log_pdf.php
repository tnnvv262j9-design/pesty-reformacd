<?php
require_once 'db_connect.php';

$fpdf_paths = [
    '../fpdf/fpdf.php',
    '../../fpdf/fpdf.php',
    'fpdf/fpdf.php',
    '../lib/fpdf/fpdf.php',
    __DIR__ . '/../fpdf/fpdf.php'
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
    die('No se encontró FPDF');
}

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$mode = isset($_GET['mode']) ? $_GET['mode'] : 'technician';
$technician_id = isset($_GET['technician_id']) ? intval($_GET['technician_id']) : 0;
$epp_delivery_id = isset($_GET['epp_delivery_id']) ? intval($_GET['epp_delivery_id']) : 0;
$service_id = isset($_GET['service_id']) ? intval($_GET['service_id']) : 0;

if ($company_id <= 0) {
    die('company_id requerido');
}

$headers = [];
$rows = [];
$title = 'Bitácora EPP';

if ($mode === 'technician' && $technician_id > 0) {
    $stmt = $conn->prepare("SELECT d.delivery_date, d.equipment_type, d.quantity, d.equipment_status, m.maintenance_date, m.type, m.notes FROM epp_deliveries d LEFT JOIN epp_maintenance m ON d.id = m.epp_delivery_id WHERE d.company_id = ? AND d.technician_id = ? ORDER BY d.delivery_date DESC, m.maintenance_date DESC");
    $stmt->bind_param("ii", $company_id, $technician_id);
    $headers = ['Entrega', 'Equipo', 'Cantidad', 'Estado', 'Fecha', 'Tipo', 'Notas'];
} elseif ($mode === 'item' && $epp_delivery_id > 0) {
    $stmt = $conn->prepare("SELECT d.delivery_date, d.equipment_type, d.quantity, d.equipment_status, m.maintenance_date, m.type, m.notes FROM epp_deliveries d LEFT JOIN epp_maintenance m ON d.id = m.epp_delivery_id WHERE d.company_id = ? AND d.id = ? ORDER BY m.maintenance_date DESC");
    $stmt->bind_param("ii", $company_id, $epp_delivery_id);
    $headers = ['Entrega', 'Equipo', 'Cantidad', 'Estado', 'Fecha', 'Tipo', 'Notas'];
} elseif ($mode === 'service' && $service_id > 0) {
    $stmt = $conn->prepare("SELECT u.equipment_type, u.used_quantity, u.notes FROM epp_service_usage u WHERE u.company_id = ? AND u.service_id = ? ORDER BY u.created_at DESC");
    $stmt->bind_param("ii", $company_id, $service_id);
    $headers = ['Equipo', 'Cantidad', 'Notas'];
    $title = 'Bitácora EPP por Servicio';
} else {
    $stmt = $conn->prepare("SELECT d.delivery_date, d.equipment_type, d.quantity, d.equipment_status FROM epp_deliveries d WHERE d.company_id = ? ORDER BY d.delivery_date DESC");
    $stmt->bind_param("i", $company_id);
    $headers = ['Entrega', 'Equipo', 'Cantidad', 'Estado'];
    $title = 'Entregas de EPP';
}
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_row()) $rows[] = $row;
$stmt->close();

$pdf = new FPDF('P', 'mm', 'A4');
$pdf->AddPage();
$pdf->SetFont('Arial', 'B', 14);
$pdf->Cell(0, 10, utf8_decode($title), 0, 1, 'C');
$pdf->SetFont('Arial', '', 10);
foreach ($headers as $h) {
    $pdf->Cell(190 / count($headers), 7, utf8_decode($h), 1, 0, 'C');
}
$pdf->Ln();
if (empty($rows)) {
    $pdf->Cell(0, 10, utf8_decode('Sin registros'), 1, 1, 'C');
} else {
    foreach ($rows as $r) {
        foreach ($r as $c) {
            $pdf->Cell(190 / count($headers), 6, utf8_decode((string)$c), 1);
        }
        $pdf->Ln();
    }
}
$pdf->Output('I', 'bitacora_epp.pdf');
exit;
?>
