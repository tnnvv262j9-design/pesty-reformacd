<?php
ini_set('display_errors', 0);
header('Content-Type: application/json');
require_once 'db_connect.php';
require_once 'check_limits.php';

$input = json_decode(file_get_contents('php://input'), true);
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : (isset($input['company_id']) ? intval($input['company_id']) : 0);

if (!$company_id) {
    echo json_encode(['success' => false, 'message' => 'ID de empresa requerido']);
    exit;
}

$stats = [];
$types = ['service', 'client', 'technician', 'quote', 'payment_note', 'document', 'chemical'];
$labels = [
    'service' => 'Servicios',
    'client' => 'Clientes',
    'technician' => 'Técnicos',
    'quote' => 'Cotizaciones',
    'payment_note' => 'Notas de Pago',
    'document' => 'Biblioteca',
    'chemical' => 'Químicos'
];

foreach ($types as $type) {
    // Usamos checkLimit para obtener los datos sin reinventar la rueda, aunque checkLimit hace queries por separado.
    // Para optimizar se podría hacer una sola query, pero por ahora reutilizamos lógica.
    // checkLimit devuelve current y limit aunque allowed sea true.
    $result = checkLimit($conn, $company_id, $type);
    
    // Si allowed es true, result tiene current y limit. Si es false, también.
    // Solo si hubo error grave no los tendría.
    
    $stats[$type] = [
        'label' => $labels[$type],
        'current' => $result['current'] ?? 0,
        'limit' => $result['limit'] ?? 0,
        'percent' => ($result['limit'] > 0) ? round(($result['current'] / $result['limit']) * 100) : 0
    ];
}

echo json_encode(['success' => true, 'stats' => $stats]);
$conn->close();
?>
