<?php
include 'db_connect.php';

// MODIFICADO: Se une la tabla 'companies' para obtener el nombre de la empresa.
$sql = "
    SELECT 
        s.id,
        s.service_date,
        s.service_time,
        s.status,
        c.full_name as client_name,
        t.name as technician_name,
        co.name as company_name 
    FROM services s
    LEFT JOIN clients c ON s.client_id = c.id
    LEFT JOIN technicians t ON s.technician_id = t.id
    LEFT JOIN companies co ON s.company_id = co.id
";

$result = $conn->query($sql);
$events = [];

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        // Asignar color basado en el estado
        $color = '#FBBF24'; // Amarillo para Pendiente (default)
        if ($row['status'] == 'Realizado') {
            $color = '#34D399'; // Verde
        } elseif ($row['status'] == 'Cancelado') {
            $color = '#F87171'; // Rojo
        }

        $events[] = [
            'id' => $row['id'],
            'title' => 'Cliente: ' . ($row['client_name'] ?? 'N/A'),
            'start' => $row['service_date'] . 'T' . ($row['service_time'] ?? '00:00:00'),
            'color' => $color,
            'extendedProps' => [
                'technician' => 'Técnico: ' . ($row['technician_name'] ?? 'No asignado'),
                'status' => 'Estado: ' . $row['status'],
                'company_name' => $row['company_name'] ?? null // MODIFICADO: Se añade el nombre de la empresa
            ]
        ];
    }
}

echo json_encode($events);

$conn->close();
?>
