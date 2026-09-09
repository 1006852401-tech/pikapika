#pragma once
#include "PluginProcessor.h"
#include <juce_gui_extra/juce_gui_extra.h>
#include <optional>
#include <memory>
#include <atomic>

class PikachuAudioMeterEditor : public juce::AudioProcessorEditor,
                                private juce::Timer
{
public:
    PikachuAudioMeterEditor (PikachuAudioMeterAudioProcessor&);
    ~PikachuAudioMeterEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;
    void timerCallback() override;

    class MeterWebView : public juce::WebBrowserComponent
    {
    public:
        using juce::WebBrowserComponent::WebBrowserComponent;

        void pageFinishedLoading (const juce::String&) override
        {
            isPageReady.store (true);
        }

        std::atomic<bool> isPageReady { false };
    };

private:
    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url);

    PikachuAudioMeterAudioProcessor& audioProcessor;
    std::unique_ptr<MeterWebView> webView;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PikachuAudioMeterEditor)
};
