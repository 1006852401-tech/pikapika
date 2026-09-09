#include "PluginEditor.h"
#include <vector>
#include <cstddef>

PikachuAudioMeterEditor::PikachuAudioMeterEditor (PikachuAudioMeterAudioProcessor& p)
    : AudioProcessorEditor (&p), audioProcessor (p)
{
    // 1. 设置插件窗口尺寸 (16:9 比例锁定)
    setSize (880, 495);
    setResizable (true, true);
    setResizeLimits (640, 360, 1600, 900);
    if (auto* c = getConstrainer())
        c->setFixedAspectRatio (16.0 / 9.0);

    // 2. 使用 JUCE 8 原生 ResourceProvider 构造 WebView，彻底杜绝本地 file:// CORS 拦截
    webView = std::make_unique<juce::WebBrowserComponent> (
        juce::WebBrowserComponent::Options()
            .withResourceProvider ([this] (const juce::String& url) {
                return getResource (url);
            })
            .withKeepPageLoadedWhenBrowserIsHidden (true)
    );

    addAndMakeVisible (*webView);
    webView->setBounds (getLocalBounds());

    // 加载通过内部资源协议托管的前端 UI 根路径
    webView->goToURL (juce::WebBrowserComponent::getResourceProviderRoot());

    // 3. 60Hz 独立定时器向 JS 网页推送实时分贝数据
    startTimerHz (60);
}

PikachuAudioMeterEditor::~PikachuAudioMeterEditor()
{
    stopTimer();
    webView.reset();
}

std::optional<juce::WebBrowserComponent::Resource> PikachuAudioMeterEditor::getResource (const juce::String& url)
{
    auto exeFile = juce::File::getSpecialLocation (juce::File::currentExecutableFile);
    
    // 定位插件包内部 Resources 目录
    auto bundleContents = exeFile.getParentDirectory().getParentDirectory();
    auto distDir = bundleContents.getChildFile ("Resources/dist");
    if (! distDir.exists())
        distDir = bundleContents.getChildFile ("Resources");

    juce::String cleanUrl = url;
    if (cleanUrl.containsChar ('?'))
        cleanUrl = cleanUrl.upToFirstOccurrenceOf ("?", false, false);
    if (cleanUrl.containsChar ('#'))
        cleanUrl = cleanUrl.upToFirstOccurrenceOf ("#", false, false);

    if (cleanUrl == "/" || cleanUrl.isEmpty())
        cleanUrl = "/index.html";

    while (cleanUrl.startsWithChar ('/'))
        cleanUrl = cleanUrl.substring (1);

    auto targetFile = distDir.getChildFile (cleanUrl);
    if (! targetFile.existsAsFile())
    {
        // 针对 SPA 单页路由 fallback 到 index.html
        targetFile = distDir.getChildFile ("index.html");
        if (! targetFile.existsAsFile())
            return std::nullopt;
    }

    juce::MemoryBlock mb;
    targetFile.loadFileAsData (mb);

    std::vector<std::byte> data;
    data.resize (mb.getSize());
    std::memcpy (data.data(), mb.getData(), mb.getSize());

    juce::String mimeType = "application/octet-stream";
    if (targetFile.hasFileExtension (".html")) mimeType = "text/html";
    else if (targetFile.hasFileExtension (".js")) mimeType = "application/javascript";
    else if (targetFile.hasFileExtension (".css")) mimeType = "text/css";
    else if (targetFile.hasFileExtension (".svg")) mimeType = "image/svg+xml";
    else if (targetFile.hasFileExtension (".png")) mimeType = "image/png";
    else if (targetFile.hasFileExtension (".jpg") || targetFile.hasFileExtension (".jpeg")) mimeType = "image/jpeg";
    else if (targetFile.hasFileExtension (".ico")) mimeType = "image/x-icon";
    else if (targetFile.hasFileExtension (".json")) mimeType = "application/json";
    else if (targetFile.hasFileExtension (".woff2")) mimeType = "font/woff2";

    return juce::WebBrowserComponent::Resource { std::move (data), mimeType };
}

void PikachuAudioMeterEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colour (0xff07090f));
}

void PikachuAudioMeterEditor::resized()
{
    if (webView)
        webView->setBounds (getLocalBounds());
}

void PikachuAudioMeterEditor::timerCallback()
{
    if (! webView) return;

    const float lPeak = audioProcessor.leftPeakDb.load();
    const float rPeak = audioProcessor.rightPeakDb.load();
    const float lRms  = audioProcessor.leftRmsDb.load();
    const float rRms  = audioProcessor.rightRmsDb.load();

    // 调起网页中的 window.__onDawMeterUpdate
    juce::String js = juce::String::formatted (
        "if(window.__onDawMeterUpdate){window.__onDawMeterUpdate(%.2f,%.2f,%.2f,%.2f);}",
        lPeak, rPeak, lRms, rRms);
    webView->evaluateJavascript (js);
}
