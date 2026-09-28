<?php
// Configurar headers para JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

include 'db_connect.php';
require_once 'encryption_service.php';
require_once 'check_limits.php';
require_once 'audit_log_helper.php';

// Leer y validar JSON de entrada
$input = file_get_contents("php://input");
$data = json_decode($input ?: '{}');
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'message' => 'Error al decodificar JSON: ' . json_last_error_msg()]);
    exit();
}

// --- Verificar Límite de Servicios ---
// Solo si es un servicio nuevo (sin ID)
if (empty($data->id)) {
    if (!isset($data->company_id)) {
        echo json_encode(['success' => false, 'message' => 'Falta company_id para validar el límite de servicios.']);
        exit();
    }
    $limitCheck = checkLimit($conn, $data->company_id, 'service');
    if (!$limitCheck['allowed']) {
        echo json_encode(['success' => false, 'message' => $limitCheck['message']]);
        exit();
    }
}
// ------------------------------------

$encryption = new EncryptionService();

// Validación mínima de datos requeridos
if (!isset($data->company_id, $data->client_id, $data->service_date, $data->price)) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos para agendar el servicio.']);
    exit();
}

$conn->begin_transaction();

try {
    $technician_id = $data->technician_id;

    // Si se envía un nuevo técnico, crearlo primero
    if (isset($data->new_technician) && !empty($data->new_technician->name)) {
        $new_tech = $data->new_technician;
        
        // Generar un código de acceso único
        do {
            $access_code = "TECH-" . rand(1000, 9999);
            $check_stmt = $conn->prepare("SELECT id FROM technicians WHERE access_code = ?");
            $check_stmt->bind_param("s", $access_code);
            $check_stmt->execute();
            $check_stmt->store_result();
            $num_rows = $check_stmt->num_rows;
            $check_stmt->close();
        } while ($num_rows > 0);

        $stmt_tech = $conn->prepare("INSERT INTO technicians (company_id, name, phone, address, access_code) VALUES (?, ?, ?, ?, ?)");
        $stmt_tech->bind_param("issss", $data->company_id, $new_tech->name, $new_tech->phone, $new_tech->address, $access_code);
        
        if (!$stmt_tech->execute()) {
            throw new Exception('Error al crear el nuevo técnico: ' . $stmt_tech->error);
        }
        $technician_id = $stmt_tech->insert_id; // Usar el ID del técnico recién creado
        $stmt_tech->close();
    }

    if (empty($technician_id)) {
        throw new Exception('No se pudo determinar el técnico para el servicio.');
    }

    $encrypted_notes = !empty($data->notes) ? $encryption->encrypt($data->notes) : '';
    $reinforcement_days = isset($data->reinforcement_days) && $data->reinforcement_days !== '' ? $data->reinforcement_days : null;
    $client_site_id = isset($data->client_site_id) && $data->client_site_id !== '' ? intval($data->client_site_id) : null;

    $has_client_site_column = false;
    $check_result = $conn->query("SHOW COLUMNS FROM services LIKE 'client_site_id'");
    if ($check_result && $check_result->num_rows > 0) {
        $has_client_site_column = true;
    }

    if ($has_client_site_column) {
        $sql_service = "INSERT INTO services (company_id, client_id, client_site_id, technician_id, status, service_date, service_time, service_type, pests, notes, price, reinforcement_days) VALUES (?, ?, ?, ?, 'Pendiente', ?, ?, ?, ?, ?, ?, ?)";
        $stmt_service = $conn->prepare($sql_service);
        if (!$stmt_service) {
            throw new Exception('Error preparando inserción de servicio (con sucursal): ' . $conn->error);
        }
        $stmt_service->bind_param(
            'iiiisssssdi',
            $data->company_id,
            $data->client_id,
            $client_site_id,
            $technician_id,
            $data->service_date,
            $data->service_time,
            $data->service_type,
            $data->pests,
            $encrypted_notes,
            $data->price,
            $reinforcement_days
        );
    } else {
        $sql_service = "INSERT INTO services (company_id, client_id, technician_id, status, service_date, service_time, service_type, pests, notes, price, reinforcement_days) VALUES (?, ?, ?, 'Pendiente', ?, ?, ?, ?, ?, ?, ?)";
        $stmt_service = $conn->prepare($sql_service);
        if (!$stmt_service) {
            throw new Exception('Error preparando inserción de servicio: ' . $conn->error);
        }
        $stmt_service->bind_param(
            'iiisssssdi',
            $data->company_id,
            $data->client_id,
            $technician_id,
            $data->service_date,
            $data->service_time,
            $data->service_type,
            $data->pests,
            $encrypted_notes,
            $data->price,
            $reinforcement_days
        );
    }

    if (!$stmt_service->execute()) {
        throw new Exception('Error al agendar el servicio: ' . $stmt_service->error);
    }
    $service_id = $stmt_service->insert_id;
    $stmt_service->close();

    // 2. Procesar productos utilizados (si existen)
    if (isset($data->products_used) && is_array($data->products_used) && !empty($data->products_used)) {
        $sql_product_usage = "INSERT INTO service_products (service_id, product_id, quantity_used) VALUES (?, ?, ?)";
        $stmt_product_usage = $conn->prepare($sql_product_usage);

        $sql_update_stock = "UPDATE products SET stock = stock - ? WHERE id = ?";
        $stmt_update_stock = $conn->prepare($sql_update_stock);

        foreach ($data->products_used as $product) {
            if (isset($product->id) && isset($product->quantity) && $product->quantity > 0) {
                $stmt_product_usage->bind_param('iid', $service_id, $product->id, $product->quantity);
                if (!$stmt_product_usage->execute()) {
                    throw new Exception('Error al registrar el uso del producto: ' . $stmt_product_usage->error);
                }
                $stmt_update_stock->bind_param('di', $product->quantity, $product->id);
                if (!$stmt_update_stock->execute()) {
                    throw new Exception('Error al actualizar el stock del producto: ' . $stmt_update_stock->error);
                }
            }
        }
        $stmt_product_usage->close();
        $stmt_update_stock->close();
    }



    $conn->commit();

    $requesting_user_id = $data->requesting_user_id ?? null;
    log_audit_event($conn, $data->company_id, $requesting_user_id, 'servicios', 'create', 'service', $service_id, "Se agendó un nuevo servicio para el cliente ID: $data->client_id");

    echo json_encode(['success' => true, 'message' => 'Servicio agendado y stock actualizado correctamente.', 'service_id' => $service_id]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
