<?php
header('Content-Type: application/json');
include 'db_connect.php';

// Inicializar servicio de encriptación
require_once 'encryption_service.php';
try {
    $encryption = new EncryptionService();
} catch (Exception $e) {
    // Si falla la encriptación, seguimos pero sin poder desencriptar
    error_log("Error inicializando EncryptionService en rutas: " . $e->getMessage());
    $encryption = null;
}

$date = $_GET['date'] ?? date('Y-m-d');
$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    echo json_encode(['success' => false, 'message' => 'Falta company_id']);
    exit;
}

// Consulta para obtener servicios del día con coordenadas
$sql = "SELECT 
            s.id, s.service_time, s.status, s.service_type, s.technician_id, s.client_id, s.client_site_id,
            c.full_name as client_name, c.phone, c.address as client_address,
            c.latitude as client_lat, c.longitude as client_lon,
            cs.name as site_name, cs.address as site_address,
            cs.latitude as site_lat, cs.longitude as site_lon
        FROM services s
        JOIN clients c ON s.client_id = c.id
        LEFT JOIN client_sites cs ON s.client_site_id = cs.id
        WHERE s.service_date = ? AND s.company_id = ?
        ORDER BY s.service_time ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("si", $date, $company_id);
$stmt->execute();
$result = $stmt->get_result();

$services = [];
while ($row = $result->fetch_assoc()) {
    // Desencriptar datos sensibles si es necesario
    if ($encryption) {
        // Intentar desencriptar nombre del cliente (si parece encriptado o siempre por seguridad)
        // Verificamos si parece base64 y largo, o simplemente intentamos desencriptar
        $decrypted_name = $encryption->decrypt($row['client_name']);
        if ($decrypted_name !== false) {
            $row['client_name'] = $decrypted_name;
        }

        // Desencriptar dirección del cliente
        $decrypted_client_addr = $encryption->decrypt($row['client_address']);
        if ($decrypted_client_addr !== false) {
            $row['client_address'] = $decrypted_client_addr;
        }

        // Desencriptar teléfono
        $decrypted_phone = $encryption->decrypt($row['phone']);
        if ($decrypted_phone !== false) {
            $row['phone'] = $decrypted_phone;
        }

        // Desencriptar dirección de sucursal si existe
        if ($row['site_address']) {
             $decrypted_site_addr = $encryption->decrypt($row['site_address']);
             if ($decrypted_site_addr !== false) {
                 $row['site_address'] = $decrypted_site_addr;
             }
        }
    }

    // Determinar coordenadas y dirección final (prioridad sucursal)
    $lat = $row['site_lat'] ? $row['site_lat'] : $row['client_lat'];
    $lon = $row['site_lon'] ? $row['site_lon'] : $row['client_lon'];
    $address = $row['site_address'] ? $row['site_address'] : $row['client_address'];
    $name = $row['site_name'] ? $row['client_name'] . ' (' . $row['site_name'] . ')' : $row['client_name'];
    
    // Identificar qué entidad tiene la ubicación (para actualizarla si se arrastra)
    $location_type = $row['site_lat'] ? 'site' : 'client'; 
    $location_id = $row['site_lat'] ? $row['client_site_id'] : $row['client_id'];
    
    // Si no tiene ubicación, por defecto asignamos al cliente (o sucursal si es servicio de sucursal)
    if (!$lat) {
        if ($row['client_site_id']) {
            $location_type = 'site';
            $location_id = $row['client_site_id'];
        } else {
            $location_type = 'client';
            $location_id = $row['client_id'];
        }
    }

    $services[] = [
        'id' => $row['id'],
        'time' => $row['service_time'],
        'client' => $name,
        'address' => $address,
        'lat' => $lat,
        'lng' => $lon,
        'status' => $row['status'],
        'type' => $row['service_type'],
        'phone' => $row['phone'],
        'location_type' => $location_type,
        'location_id' => $location_id
    ];
}

echo json_encode(['success' => true, 'data' => $services]);
$stmt->close();
$conn->close();
?>