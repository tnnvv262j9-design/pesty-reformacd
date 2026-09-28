<?php
ini_set('display_errors', 0);
header('Content-Type: application/json');
require_once '../db_connect.php';
require_once '../audit_log_helper.php';
require_once 'check_admin_auth.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->requester_id) || !validateSuperAdmin($conn, $data->requester_id)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado.']);
    exit();
}

if (!isset($data->company_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de empresa requerido.']);
    exit();
}

$company_id = intval($data->company_id);
$plan = isset($data->plan) && $data->plan !== '' ? $data->plan : null;

$limits = [
    'limit_services' => isset($data->limit_services) ? intval($data->limit_services) : null,
    'limit_clients' => isset($data->limit_clients) ? intval($data->limit_clients) : null,
    'limit_techs' => isset($data->limit_techs) ? intval($data->limit_techs) : null,
    'limit_quotes' => isset($data->limit_quotes) ? intval($data->limit_quotes) : null,
    'limit_payment_notes' => isset($data->limit_payment_notes) ? intval($data->limit_payment_notes) : null,
    'limit_library' => isset($data->limit_library) ? intval($data->limit_library) : null,
    'limit_chemicals' => isset($data->limit_chemicals) ? intval($data->limit_chemicals) : null
];

$planLimitsMap = [
    'pesty' => [
        'limit_services' => 60,
        'limit_clients' => 60,
        'limit_techs' => 5,
        'limit_quotes' => 60,
        'limit_payment_notes' => 60,
        'limit_library' => 0,
        'limit_chemicals' => 0
    ],
    'pesty_core' => [
        'limit_services' => 200,
        'limit_clients' => 200,
        'limit_techs' => 20,
        'limit_quotes' => 999999,
        'limit_payment_notes' => 999999,
        'limit_library' => 999999,
        'limit_chemicals' => 999999
    ],
    'enterprise' => [
        'limit_services' => 999999,
        'limit_clients' => 999999,
        'limit_techs' => 999999,
        'limit_quotes' => 999999,
        'limit_payment_notes' => 999999,
        'limit_library' => 999999,
        'limit_chemicals' => 999999
    ]
];

if ($plan !== null && isset($planLimitsMap[$plan])) {
    $stmtCurrent = $conn->prepare("SELECT limit_services, limit_clients, limit_techs, limit_quotes, limit_payment_notes, limit_library, limit_chemicals FROM companies WHERE id = ?");
    if ($stmtCurrent) {
        $stmtCurrent->bind_param("i", $company_id);
        if ($stmtCurrent->execute()) {
            $resCurrent = $stmtCurrent->get_result();
            $current = $resCurrent ? $resCurrent->fetch_assoc() : null;
        } else {
            $current = null;
        }
        $stmtCurrent->close();
    } else {
        $current = null;
    }

    $planLimits = $planLimitsMap[$plan];
    $cols = ['limit_services', 'limit_clients', 'limit_techs', 'limit_quotes', 'limit_payment_notes', 'limit_library', 'limit_chemicals'];
    foreach ($cols as $col) {
        $currentVal = ($current && isset($current[$col]) && $current[$col] !== null) ? (int)$current[$col] : 0;
        $minVal = isset($planLimits[$col]) ? $planLimits[$col] : 0;
        if ($limits[$col] === null) {
            $limits[$col] = max($currentVal, $minVal);
        } else {
            $limits[$col] = max($limits[$col], $minVal);
        }
    }
}

$updates = [];
$types = "";
$params = [];

foreach ($limits as $col => $val) {
    if ($val !== null) {
        $updates[] = "$col = ?";
        $types .= "i";
        $params[] = $val;
    }
}

if ($plan !== null) {
    $updates[] = "plan = ?";
    $types .= "s";
    $params[] = $plan;
}

if (empty($updates)) {
    echo json_encode(['success' => true, 'message' => 'Sin cambios.']);
    exit();
}

$sql = "UPDATE companies SET " . implode(", ", $updates) . " WHERE id = ?";
$types .= "i";
$params[] = $company_id;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    // Si se especificó plan, actualizar también los módulos asociados
    if ($plan !== null) {
        $modulesByPlan = [
            'pesty' => ['dashboard','services','clients','techs','quotes','payment-notes','calendar','expenses','stats','settings'],
            'pesty_core' => ['dashboard','services','clients','techs','quotes','payment-notes','calendar','expenses','stats','settings','library','chemicals','epp'],
            'enterprise' => ['dashboard','services','clients','techs','quotes','payment-notes','calendar','expenses','stats','settings','library','chemicals','epp']
        ];
        if (isset($modulesByPlan[$plan])) {
            $desiredModules = $modulesByPlan[$plan];
            $res = $conn->query("SELECT module_access FROM companies WHERE id = " . intval($company_id));
            $currentAccess = ['modules' => [], 'actions' => []];
            if ($res && $row = $res->fetch_assoc()) {
                $decoded = json_decode($row['module_access'] ?: '{}', true);
                if (is_array($decoded)) {
                    $currentAccess['modules'] = isset($decoded['modules']) && is_array($decoded['modules']) ? $decoded['modules'] : [];
                    $currentAccess['actions'] = isset($decoded['actions']) && is_array($decoded['actions']) ? $decoded['actions'] : [];
                }
            }
            $merged = array_values(array_unique(array_merge($currentAccess['modules'], $desiredModules)));
            $newAccess = json_encode(['modules' => $merged, 'actions' => $currentAccess['actions']]);
            $stmtMa = $conn->prepare("UPDATE companies SET module_access = ? WHERE id = ?");
            if ($stmtMa) {
                $stmtMa->bind_param("si", $newAccess, $company_id);
                $stmtMa->execute();
                $stmtMa->close();
            }
        }
    }
    $descParts = [];
    if ($plan !== null) {
        $descParts[] = 'Plan: ' . $plan;
    }
    foreach ($limits as $col => $val) {
        if ($val !== null) {
            $descParts[] = $col . '=' . $val;
        }
    }
    $description = 'Actualización de límites para empresa ' . $company_id . ' (' . implode(', ', $descParts) . ')';
    $requesterId = isset($data->requester_id) ? intval($data->requester_id) : null;
    log_audit_event($conn, $company_id, $requesterId, 'admin', 'update_company_limits', 'company', $company_id, $description);
    echo json_encode(['success' => true, 'message' => 'Límites actualizados correctamente.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $conn->error]);
}

$stmt->close();
$conn->close();
?>
