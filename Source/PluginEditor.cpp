#include "PluginEditor.h"
#include <vector>
#include <cstddef>

static juce::File findDistDir()
{
    // 1. macOS 插件首选：currentApplicationFile (精准定位当前被 Reaper 加载的 .vst3 插件包根目录)
    auto appFile = juce::File::getSpecialLocation (juce::File::currentApplicationFile);
    if (appFile.exists())
    {
        auto d1 = appFile.getChildFile ("Contents/Resources/dist");
        if (d1.getChildFile ("index.html").existsAsFile()) return d1;

        auto d2 = appFile.getChildFile ("Contents/Resources");
        if (d2.getChildFile ("index.html").existsAsFile()) return d2;
    }

    // 2. 独立运行程序兜底：currentExecutableFile
    auto exeFile = juce::File::getSpecialLocation (juce::File::currentExecutableFile);
    if (exeFile.exists())
    {
        auto bundleContents = exeFile.getParentDirectory().getParentDirectory();
        auto d1 = bundleContents.getChildFile ("Resources/dist");
        if (d1.getChildFile ("index.html").existsAsFile()) return d1;

        auto d2 = bundleContents.getChildFile ("Resources");
        if (d2.getChildFile ("index.html").existsAsFile()) return d2;
    }

    // 3. 全局扫描 macOS 系统 Plug-Ins 标准目录三重保险
    juce::Array<juce::File> searchDirs = {
        juce::File ("/Library/Audio/Plug-Ins/VST3/PikachuAudioMeter.vst3"),
        juce::File ("/Library/Audio/Plug-Ins/VST3/Pikachu Thunderbolt Audio Meter.vst3"),
        juce::File ("/Library/Audio/Plug-Ins/Components/PikachuAudioMeter.component"),
        juce::File ("/Library/Audio/Plug-Ins/Components/Pikachu Thunderbolt Audio Meter.component"),
        juce::File::getSpecialLocation (juce::File::userHomeDirectory).getChildFile ("Library/Audio/Plug-Ins/VST3/PikachuAudioMeter.vst3"),
        juce::File::getSpecialLocation (juce::File::userHomeDirectory).getChildFile ("Library/Audio/Plug-Ins/VST3/Pikachu Thunderbolt Audio Meter.vst3"),
        juce::File::getSpecialLocation (juce::File::userHomeDirectory).getChildFile ("Library/Audio/Plug-Ins/Components/PikachuAudioMeter.component"),
        juce::File::getSpecialLocation (juce::File::userHomeDirectory).getChildFile ("Library/Audio/Plug-Ins/Components/Pikachu Thunderbolt Audio Meter.component")
    };

    for (auto& dir : searchDirs)
    {
        if (dir.exists())
        {
            auto d1 = dir.getChildFile ("Contents/Resources/dist");
            if (d1.getChildFile ("index.html").existsAsFile()) return d1;

            auto d2 = dir.getChildFile ("Contents/Resources");
            if (d2.getChildFile ("index.html").existsAsFile()) return d2;
        }
    }

    return {};
}

PikachuAudioMeterEditor::PikachuAudioMeterEditor (PikachuAudioMeterAudioProcessor& p)
    : AudioProcessorEditor (&p), audioProcessor (p)
{
    // 1. 设置插件窗口尺寸 (16:9 比例锁定)
    setSize (880, 495);
    setResizable (true, true);
    setResizeLimits (640, 360, 1600, 900);
    if (auto* c = getConstrainer())
        c->setFixedAspectRatio (16.0 / 9.0);

    // 2. 构造支持 ResourceProvider 的 WebView
    webView = std::make_unique<MeterWebView> (
        juce::WebBrowserComponent::Options()
            .withResourceProvider ([this] (const juce::String& url) {
                return getResource (url);
            })
            .withKeepPageLoadedWhenBrowserIsHidden (true)
    );

    addAndMakeVisible (*webView);
    webView->setBounds (getLocalBounds());

    // 3. 导航至 ResourceProvider 内部协议根目录
    webView->goToURL (juce::WebBrowserComponent::getResourceProviderRoot());

    // 4. 启动 60Hz 独立刷新（网页加载完成标记置为 true 后才开始向 JS 推送数据，杜绝白屏冲突）
    startTimerHz (60);
}

PikachuAudioMeterEditor::~PikachuAudioMeterEditor()
{
    stopTimer();
    webView.reset();
}

std::optional<juce::WebBrowserComponent::Resource> PikachuAudioMeterEditor::getResource (const juce::String& url)
{
    auto distDir = findDistDir();
    if (! distDir.exists())
        return std::nullopt;

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
        targetFile = distDir.getChildFile ("index.html");
        if (! targetFile.existsAsFile())
            return std::nullopt;
    }

    juce::MemoryBlock mb;
    targetFile.loadFileAsData (mb);

    std::vector<std::byte> data;
    data.resize (mb.getSize());
    if (mb.getSize() > 0)
        std::memcpy (data.data(), mb.getData(), mb.getSize());

    juce::String mimeType = "application/octet-stream";
    if (targetFile.hasFileExtension (".html") || targetFile.hasFileExtension (".htm")) mimeType = "text/html";
    else if (targetFile.hasFileExtension (".js") || targetFile.hasFileExtension (".mjs")) mimeType = "application/javascript";
    else if (targetFile.hasFileExtension (".css")) mimeType = "text/css";
    else if (targetFile.hasFileExtension (".svg")) mimeType = "image/svg+xml";
    else if (targetFile.hasFileExtension (".png")) mimeType = "image/png";
    else if (targetFile.hasFileExtension (".jpg") || targetFile.hasFileExtension (".jpeg")) mimeType = "image/jpeg";
    else if (targetFile.hasFileExtension (".ico")) mimeType = "image/x-icon";
    else if (targetFile.hasFileExtension (".json")) mimeType = "application/json";
    else if (targetFile.hasFileExtension (".woff2")) mimeType = "font/woff2";
    else if (targetFile.hasFileExtension (".woff")) mimeType = "font/woff";
    else if (targetFile.hasFileExtension (".ttf")) mimeType = "font/ttf";

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
    if (! webView || ! webView->isPageReady.load()) return;

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
