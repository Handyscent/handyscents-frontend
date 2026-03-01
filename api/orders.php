<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$configPath = __DIR__ . '/config.php';
if (is_file($configPath)) {
    require_once $configPath;
}

$scriptUrl = trim((string) (getenv('APPSCRIPT_WEBAPP_URL') ?: (defined('APPSCRIPT_WEBAPP_URL') ? APPSCRIPT_WEBAPP_URL : '')));
$scriptSecret = trim((string) (getenv('APPSCRIPT_SECRET') ?: (defined('APPSCRIPT_SECRET') ? APPSCRIPT_SECRET : '')));

if ($scriptUrl === '') {
    http_response_code(500);
    echo json_encode(['error' => 'Server Error Please Contact Support']);
    exit;
}

$payload = [
    'orderNumber' => (string) ($_POST['orderNumber'] ?? ''),
    'creatorName' => (string) ($_POST['creatorName'] ?? ''),
    'quantityOrdered' => (string) ($_POST['quantityOrdered'] ?? ''),
    'submittedUrl' => (string) ($_POST['submittedUrl'] ?? ''),
    'orderConfirmationLink' => (string) ($_POST['orderConfirmationLink'] ?? ''),
    'message' => (string) ($_POST['message'] ?? ''),
    'submittedQrUrl' => (string) ($_POST['submittedQr'] ?? ''),
    'confirmationQrUrl' => (string) ($_POST['confirmationQr'] ?? ''),
];

if ($scriptSecret !== '') {
    $payload['secret'] = $scriptSecret;
}

for ($index = 1; $index <= 5; $index++) {
    $fileKey = 'image' . $index;
    if (!isset($_FILES[$fileKey]) || !is_array($_FILES[$fileKey])) {
        continue;
    }

    $upload = $_FILES[$fileKey];
    $tmpName = (string) ($upload['tmp_name'] ?? '');
    $errorCode = (int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($errorCode !== UPLOAD_ERR_OK || $tmpName === '' || !is_uploaded_file($tmpName)) {
        continue;
    }

    $content = @file_get_contents($tmpName);
    if ($content === false) {
        continue;
    }

    $payload['image' . $index . 'Base64'] = base64_encode($content);
    $payload['image' . $index . 'Name'] = (string) ($upload['name'] ?? '');
}

$ch = curl_init($scriptUrl);
if ($ch === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
    exit;
}

$body = json_encode($payload);
if ($body === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
    exit;
}

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
]);

$responseBody = curl_exec($ch);
$statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($responseBody === false) {
    http_response_code(502);
    echo json_encode(['error' => $curlError !== '' ? $curlError : 'Upstream request failed']);
    exit;
}

$decoded = json_decode($responseBody, true);
if (!is_array($decoded)) {
    $decoded = ['error' => $responseBody !== '' ? $responseBody : 'Apps Script returned non-JSON'];
}

if ($statusCode < 200 || $statusCode >= 300) {
    http_response_code($statusCode > 0 ? $statusCode : 502);
    echo json_encode($decoded);
    exit;
}

if (($decoded['success'] ?? false) !== true) {
    http_response_code(502);
    echo json_encode($decoded);
    exit;
}

http_response_code(200);
echo json_encode(['success' => true]);
