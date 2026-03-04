<?php
/**
 * Same-origin API for order submission and image upload. Proxies to Google Apps Script.
 * Behavior parity with api/orders.ts (Vercel serverless).
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        http_response_code(200);
        header('Allow: POST');
        echo json_encode(['message' => 'Order API. Use POST to submit orders or upload images.']);
        exit;
    }
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$APPSCRIPT_URL = '';
$APPSCRIPT_SECRET = '';
if (is_file(__DIR__ . '/config.php')) {
    $cfg = include __DIR__ . '/config.php';
    $APPSCRIPT_URL = isset($cfg['APPSCRIPT_WEBAPP_URL']) ? trim((string) $cfg['APPSCRIPT_WEBAPP_URL']) : '';
    $APPSCRIPT_SECRET = isset($cfg['APPSCRIPT_SECRET']) ? trim((string) $cfg['APPSCRIPT_SECRET']) : '';
}
if ($APPSCRIPT_URL === '') {
    $APPSCRIPT_URL = trim((string) getenv('APPSCRIPT_WEBAPP_URL'));
    $APPSCRIPT_SECRET = trim((string) getenv('APPSCRIPT_SECRET'));
}

if ($APPSCRIPT_URL === '') {
    http_response_code(500);
    echo json_encode(['error' => 'Server Error Please Contact Support']);
    exit;
}

function sendJson(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

$action = isset($_POST['action']) ? trim($_POST['action']) : '';

if ($action === 'uploadImage') {
    $orderId = isset($_POST['orderId']) ? preg_replace('/^#|\s/', '', trim($_POST['orderId'])) : '';
    $imageIndex = isset($_POST['imageIndex']) ? (int) $_POST['imageIndex'] : 0;
    $file = isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK ? $_FILES['image'] : null;

    if (!$orderId || $imageIndex < 1 || $imageIndex > 5 || !$file || !is_uploaded_file($file['tmp_name'])) {
        sendJson(400, ['error' => 'uploadImage requires orderId, imageIndex (1-5), and image file']);
    }

    $base64 = base64_encode(file_get_contents($file['tmp_name']));
    $fileName = !empty($file['name']) ? $file['name'] : "ORDER{$orderId}_Image{$imageIndex}.jpg";

    $imgPayload = [
        'action' => 'uploadImage',
        'orderId' => $orderId,
        'orderNumber' => $orderId,
        'imageIndex' => $imageIndex,
        'base64' => $base64,
        'fileName' => $fileName,
    ];
    if ($APPSCRIPT_SECRET !== '') {
        $imgPayload['secret'] = $APPSCRIPT_SECRET;
    }

    $ch = curl_init($APPSCRIPT_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($imgPayload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 55,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $responseBody = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($responseBody === false) {
        $err = curl_error($ch);
        curl_close($ch);
        sendJson(502, ['error' => 'Apps Script request failed: ' . ($err ?: 'unknown')]);
    }
    curl_close($ch);

    $data = ['error' => $responseBody ?: 'Apps Script returned non-JSON'];
    if ($responseBody !== false && $responseBody !== '') {
        $decoded = json_decode($responseBody, true);
        if (is_array($decoded)) {
            $data = $decoded;
        }
    }

    if ($httpCode >= 400) {
        sendJson($httpCode, $data);
    }
    if (empty($data['success'])) {
        sendJson(502, $data);
    }
    sendJson(200, ['success' => true]);
}

// Normal order submission
$orderNumber = isset($_POST['orderNumber']) ? trim($_POST['orderNumber']) : '';
$creatorName = isset($_POST['creatorName']) ? trim($_POST['creatorName']) : '';
$quantityOrdered = isset($_POST['quantityOrdered']) ? trim($_POST['quantityOrdered']) : '';
$submittedUrl = isset($_POST['submittedUrl']) ? trim($_POST['submittedUrl']) : '';
$orderConfirmationLink = isset($_POST['orderConfirmationLink']) ? trim($_POST['orderConfirmationLink']) : '';
$message = isset($_POST['message']) ? trim($_POST['message']) : '';
$submittedQrUrl = isset($_POST['submittedQr']) ? trim($_POST['submittedQr']) : '';
$confirmationQrUrl = isset($_POST['confirmationQr']) ? trim($_POST['confirmationQr']) : '';

$orderPayload = [
    'orderNumber' => $orderNumber,
    'creatorName' => $creatorName,
    'quantityOrdered' => $quantityOrdered,
    'submittedUrl' => $submittedUrl,
    'orderConfirmationLink' => $orderConfirmationLink,
    'message' => $message,
    'submittedQrUrl' => $submittedQrUrl,
    'confirmationQrUrl' => $confirmationQrUrl,
];
if ($APPSCRIPT_SECRET !== '') {
    $orderPayload['secret'] = $APPSCRIPT_SECRET;
}

$ch = curl_init($APPSCRIPT_URL);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($orderPayload),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 55,
    CURLOPT_FOLLOWLOCATION => true,
]);
$responseBody = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($responseBody === false) {
    $err = curl_error($ch);
    curl_close($ch);
    sendJson(502, ['error' => 'Apps Script request failed: ' . ($err ?: 'unknown')]);
}
curl_close($ch);

$data = ['error' => $responseBody ?: 'Apps Script returned non-JSON'];
if ($responseBody !== false && $responseBody !== '') {
    $decoded = json_decode($responseBody, true);
    if (is_array($decoded)) {
        $data = $decoded;
    }
}

if ($httpCode >= 400) {
    sendJson($httpCode, $data);
}
if (empty($data['success'])) {
    sendJson(502, $data);
}
sendJson(200, ['success' => true]);
