#pragma once
#include "PluginProcessor.h"
#include <juce_gui_extra/juce_gui_extra.h>
#include <optional>
#include <memory>

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
    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url);

    PikachuAudioMeterAudioProcessor& audioProcessor;
    std::unique_ptr<juce::WebBrowserComponent> webView;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PikachuAudioMeterEditor)
};
