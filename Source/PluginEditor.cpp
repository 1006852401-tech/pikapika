#include "PluginEditor.h"

PikachuAudioMeterEditor::PikachuAudioMeterEditor (PikachuAudioMeterAudioProcessor& p)
    : AudioProcessorEditor (&p), audioProcessor (p)
{
    // 1. 严格锁定 16:9 比例，杜绝宿主拉伸
    setResizable (true, true);
    setResizeLimits (640, 360, 1600, 900);
    getConstrainer()->setFixedAspectRatio (16.0 / 9.0);
    setSize (880, 495);

    // 2. 挂载硬件加速 WKWebView
    addAndMakeVisible (webView);

    // 读取插件包内部 Resources/dist/index.html
    auto exeFile = juce::File::getSpecialLocation (juce::File::currentExecutableFile);
    auto resourcesDist = exeFile.getParentDirectory().getParentDirectory().getChildFile ("Resources/dist/index.html");

    if (resourcesDist.existsAsFile())
    {
        webView.goToURL ("file://" + resourcesDist.getFullPathName());
    }
    else
    {
        // 独立运行或本地开发调试
        webView.goToURL ("http://127.0.0.1:3000");
    }

    // 3. 60Hz 独立刷新向 JS 网页推送实时分贝数据
    startTimerHz (60);
}

PikachuAudioMeterEditor::~PikachuAudioMeterEditor()
{
    stopTimer();
}

void PikachuAudioMeterEditor::paint (juce::Graphics& g)
{
    // 不透明深色底色，防止 DAW 产生残影
    g.fillAll (juce::Colour (0xff07090f));
}

void PikachuAudioMeterEditor::resized()
{
    webView.setBounds (getLocalBounds());
}

void PikachuAudioMeterEditor::timerCallback()
{
    const float lPeak = audioProcessor.leftPeakDb.load();
    const float rPeak = audioProcessor.rightPeakDb.load();
    const float lRms  = audioProcessor.leftRmsDb.load();
    const float rRms  = audioProcessor.rightRmsDb.load();

    // 调起网页中的 window.__onDawMeterUpdate
    juce::String js = juce::String::formatted (
        "if(window.__onDawMeterUpdate)window.__onDawMeterUpdate(%.2f, %.2f, %.2f, %.2f);",
        lPeak, rPeak, lRms, rRms);
    webView.evaluateJavascript (js);
}
