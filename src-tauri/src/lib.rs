use std::collections::HashMap;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct YoutubeMusicHttpResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}

/// The desktop WebView cannot send the Origin/Referer headers required by YouTube Music
/// InnerTube, and direct requests are subject to WebView CORS. Keep this proxy restricted
/// to the public YouTube Music API hosts; it never accepts cookies or auth credentials.
#[tauri::command]
async fn youtube_music_http_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<YoutubeMusicHttpResponse, String> {
    let parsed = reqwest::Url::parse(&url).map_err(|_| "Invalid YouTube Music URL".to_string())?;
    let host = parsed.host_str().unwrap_or_default();
    let allowed = matches!(
        host,
        "music.youtube.com" | "www.youtube.com" | "youtubei.googleapis.com"
    );
    if parsed.scheme() != "https" || !allowed {
        return Err("The YouTube Music proxy only accepts approved HTTPS YouTube hosts.".to_string());
    }

    let method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|_| "Unsupported HTTP method".to_string())?;
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(25))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|error| format!("Could not create YouTube Music HTTP client: {error}"))?;

    let mut request = client.request(method, parsed);
    for (name, value) in headers {
        let lower = name.to_ascii_lowercase();
        if matches!(lower.as_str(), "host" | "content-length" | "connection" | "cookie" | "authorization") {
            continue;
        }
        let header_name = reqwest::header::HeaderName::from_bytes(name.as_bytes())
            .map_err(|_| "Invalid request header name".to_string())?;
        let header_value = reqwest::header::HeaderValue::from_str(&value)
            .map_err(|_| "Invalid request header value".to_string())?;
        request = request.header(header_name, header_value);
    }
    if let Some(body) = body {
        request = request.body(body);
    }

    let response = request.send().await
        .map_err(|error| format!("YouTube Music request failed: {error}"))?;
    let status = response.status().as_u16();
    let response_headers = response.headers().iter()
        .filter_map(|(name, value)| value.to_str().ok().map(|value| (name.to_string(), value.to_string())))
        .collect::<HashMap<_, _>>();
    let body = response.text().await
        .map_err(|error| format!("Could not read YouTube Music response: {error}"))?;

    Ok(YoutubeMusicHttpResponse {
        status,
        headers: response_headers,
        body,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // Deep links received while ZUNO is already open are forwarded to the first process.
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}));
    }

    builder = builder.plugin(tauri_plugin_deep_link::init());

    builder
        .invoke_handler(tauri::generate_handler![youtube_music_http_request])
        .run(tauri::generate_context!())
        .expect("ZUNO Music desktop runtime failed");
}
