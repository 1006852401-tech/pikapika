#pragma once
#include "PluginProcessor.h"
#include <juce_gui_extra/juce_gui_extra.h>

class PikachuAudioMeterEditor : public juce::AudioProcessorEditor,
                                private juce::Timer
{
public:
    PikachuAudioMeterEditor (PikachuAudioMeterAudioProcessor&);
    ~PikachuAudioMeterEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;
    void timerCallback() override;

private:
    PikachuAudioMeterAudioProcessor& audioProcessor;
    juce::WebBrowserComponent webView {
        juce::WebBrowserComponent::Options()
            .withBackend (juce::WebBrowserComponent::Options::Backend::webview2_or_wkwebview)
    };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PikachuAudioMeterEditor)
};
