<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Diagnóstico de Conexión a Base de Datos</h1>";
echo "<p>Intentando conectar...</p>";

$servername = "localhost";
$username = "momacpzrzz_pesty";
$password = "pestypestypestypesty";
$dbname = "momacpzrzz_pesty";

echo "<ul>";
echo "<li><strong>Host:</strong> $servername</li>";
echo "<li><strong>Usuario:</strong> $username</li>";
echo "<li><strong>Base de Datos:</strong> $dbname</li>";
echo "<li><strong>Contraseña (longitud):</strong> " . strlen($password) . " caracteres</li>";
echo "</ul>";

try {
    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        throw new Exception("Error de conexión: " . $conn->connect_error);
    }

    echo "<p style='color:green; font-weight:bold;'>✅ Conexión EXITOSA a la base de datos.</p>";
    
    echo "<p>Información del servidor: " . $conn->server_info . "</p>";
    
    // Probar una consulta simple
    $sql = "SHOW TABLES";
    $result = $conn->query($sql);
    
    if ($result) {
        echo "<p>Tablas en la base de datos:</p><ul>";
        if ($result->num_rows > 0) {
            while($row = $result->fetch_array()) {
                echo "<li>" . $row[0] . "</li>";
            }
        } else {
            echo "<li>(Base de datos vacía)</li>";
        }
        echo "</ul>";
    } else {
        echo "<p style='color:orange;'>⚠️ Conectado, pero falló al listar tablas: " . $conn->error . "</p>";
    }
    
    $conn->close();

} catch (Exception $e) {
    echo "<p style='color:red; font-weight:bold;'>❌ ERROR FATAL:</p>";
    echo "<pre>" . $e->getMessage() . "</pre>";
} catch (Error $e) {
    echo "<p style='color:red; font-weight:bold;'>❌ ERROR DE PHP (Posiblemente extensión faltante):</p>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
?>