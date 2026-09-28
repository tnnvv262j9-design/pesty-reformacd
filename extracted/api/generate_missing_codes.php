<?php
// api/generate_missing_codes.php
header('Content-Type: application/json');
include 'db_connect.php';

$response = ['success' => false, 'messages' => [], 'updated_count' => 0];

try {
    // Buscar clientes sin código de acceso o con código vacío
    $sql = "SELECT id FROM clients WHERE access_code IS NULL OR access_code = ''";
    $result = $conn->query($sql);
    
    if ($result) {
        $ids_to_update = [];
        while ($row = $result->fetch_assoc()) {
            $ids_to_update[] = $row['id'];
        }
        
        $response['messages'][] = "Found " . count($ids_to_update) . " clients without access code.";
        
        $stmt = $conn->prepare("UPDATE clients SET access_code = ? WHERE id = ?");
        
        foreach ($ids_to_update as $id) {
            // Generar código único de 6 caracteres
            $new_code = substr(str_shuffle("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0, 6);
            
            $stmt->bind_param("si", $new_code, $id);
            $stmt->execute();
            $response['updated_count']++;
        }
        
        $stmt->close();
        $response['success'] = true;
        $response['messages'][] = "Successfully generated codes for " . $response['updated_count'] . " clients.";
        
    } else {
        throw new Exception("Error querying clients: " . $conn->error);
    }

} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response);
$conn->close();
?>