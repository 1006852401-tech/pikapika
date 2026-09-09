#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <atomic>

class PikachuAudioMeterAudioProcessor : public juce::AudioProcessor
{
public:
    PikachuAudioMeterAudioProcessor();
    ~PikachuAudioMeterAudioProcessor() override = default;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}

    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;

    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "Pikachu Thunderbolt Audio Meter"; }

    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock&) override {}
    void setStateInformation (const void*, int) override {}

    // Lock-free atomic values shared with the UI thread
    std::atomic<float> leftPeakDb { -60.0f };
    std::atomic<float> rightPeakDb { -60.0f };
    std::atomic<float> leftRmsDb { -60.0f };
    std::atomic<float> rightRmsDb { -60.0f };

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PikachuAudioMeterAudioProcessor)
};
