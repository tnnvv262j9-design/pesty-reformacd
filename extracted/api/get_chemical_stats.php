<?php
header('Content-Type: application/json');
include 'db_connect.php';

// Validar parámetros
if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Falta company_id']);
    exit();
}

$company_id = intval($_GET['company_id']);
$start_date = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-01');
$end_date = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-m-t');

// Asegurar formato de fechas completo
if (strlen($start_date) == 7) $start_date .= '-01'; // YYYY-MM -> YYYY-MM-01
if (strlen($end_date) == 7) $end_date = date('Y-m-t', strtotime($start_date));

$response = [
    'usage_by_chemical' => [],
    'cost_trend' => [],
    'alerts' => []
];

try {
    // 1. Uso de Químicos (Top 10 por Costo)
    // Se une con chemical_usage y services para filtrar por fecha y compañía
    $usage_sql = "
        SELECT 
            c.name, 
            SUM(cu.ml_used) as total_ml, 
            SUM(cu.cost_at_time) as total_cost,
            COUNT(cu.id) as usage_count
        FROM chemical_usage cu
        JOIN chemicals c ON cu.chemical_id = c.id
        JOIN services s ON cu.service_id = s.id
        WHERE c.company_id = ? 
          AND s.service_date BETWEEN ? AND ?
          AND s.status = 'Realizado'
        GROUP BY c.id, c.name
        ORDER BY total_cost DESC
        LIMIT 10
    ";
    
    $stmt = $conn->prepare($usage_sql);
    if (!$stmt) throw new Exception("Error preparando consulta usage: " . $conn->error);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        $response['usage_by_chemical'][] = [
            'name' => $row['name'],
            'total_ml' => floatval($row['total_ml']),
            'total_cost' => floatval($row['total_cost']),
            'count' => intval($row['usage_count'])
        ];
    }
    $stmt->close();

    // 2. Tendencia de Costos (Agrupado por mes o semana según rango)
    // Para simplificar, agrupamos por fecha de servicio
    $trend_sql = "
        SELECT 
            s.service_date,
            SUM(cu.cost_at_time) as daily_cost
        FROM chemical_usage cu
        JOIN services s ON cu.service_id = s.id
        JOIN chemicals c ON cu.chemical_id = c.id
        WHERE c.company_id = ? 
          AND s.service_date BETWEEN ? AND ?
          AND s.status = 'Realizado'
        GROUP BY s.service_date
        ORDER BY s.service_date ASC
    ";

    $stmt = $conn->prepare($trend_sql);
    if (!$stmt) throw new Exception("Error preparando consulta trend: " . $conn->error);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        $response['cost_trend'][] = [
            'date' => $row['service_date'],
            'cost' => floatval($row['daily_cost'])
        ];
    }
    $stmt->close();

    // 3. Alertas de Inventario (Stock bajo)
    // Esto es independiente del rango de fechas, es el estado actual
    $alerts_sql = "
        SELECT name, current_stock_ml, min_stock_ml
        FROM chemicals 
        WHERE company_id = ? 
          AND current_stock_ml <= min_stock_ml 
          AND status = 'active'
        ORDER BY current_stock_ml ASC
    ";
    
    $stmt = $conn->prepare($alerts_sql);
    if (!$stmt) throw new Exception("Error preparando consulta alerts: " . $conn->error);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        $response['alerts'][] = [
            'name' => $row['name'],
            'current_stock' => floatval($row['current_stock_ml']),
            'min_stock' => floatval($row['min_stock_ml']),
            'status' => (floatval($row['current_stock_ml']) <= 0) ? 'Agotado' : 'Bajo'
        ];
    }
    $stmt->close();

    echo json_encode(['success' => true, 'data' => $response]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

$conn->close();
?>