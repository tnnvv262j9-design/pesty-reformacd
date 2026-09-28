<?php
include 'db_connect.php';
include 'send_email_helper.php';

// Script to be run by CRON every hour
// Finds companies with trial expiring in the next 24 hours that haven't received a reminder

$now = date('Y-m-d H:i:s');
$twenty_four_hours_later = date('Y-m-d H:i:s', strtotime('+24 hours'));

$query = "SELECT id, name, email, subscription_expiry FROM companies 
          WHERE subscription_status = 'trial_active' 
          AND trial_reminder_sent = 0 
          AND subscription_expiry <= '$twenty_four_hours_later'
          AND subscription_expiry > '$now'";

$result = $conn->query($query);

if ($result && $result->num_rows > 0) {
    while ($company = $result->fetch_assoc()) {
        $to = $company['email'];
        $name = $company['name'];
        $expiry = $company['subscription_expiry'];
        
        $subject = "Tu prueba gratuita de Pesty expira pronto";
        $html = "
            <h2>Hola $name,</h2>
            <p>Te recordamos que tu periodo de prueba de 6 días para el plan <strong>PESTY</strong> está por finalizar.</p>
            <p>Tu acceso expira el: <strong>$expiry</strong></p>
            <p>Para mantener el acceso a todas las funcionalidades premium, por favor realiza tu suscripción desde el panel de control.</p>
            <br>
            <p>Saludos,<br>Equipo de Pesty Software</p>
        ";
        
        if (send_email($to, $subject, $html)) {
            $company_id = $company['id'];
            $conn->query("UPDATE companies SET trial_reminder_sent = 1 WHERE id = $company_id");
            echo "Recordatorio enviado a $name ($to)\n";
        } else {
            echo "Error enviando email a $name\n";
        }
    }
} else {
    echo "No hay recordatorios pendientes.\n";
}

$conn->close();
?>