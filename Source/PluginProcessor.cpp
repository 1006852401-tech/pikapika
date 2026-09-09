#include "PluginProcessor.h"
#include "PluginEditor.h"
#include <cmath>

PikachuAudioMeterAudioProcessor::PikachuAudioMeterAudioProcessor()
    : AudioProcessor (BusesProperties()
                        .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                        .withOutput ("Output", juce::AudioChannelSet::stereo(), true))
{
}

void PikachuAudioMeterAudioProcessor::prepareToPlay (double, int)
{
    setLatencySamples (0);
    leftPeakDb.store (-60.0f);
    rightPeakDb.store (-60.0f);
    leftRmsDb.store (-60.0f);
    rightRmsDb.store (-60.0f);
}

bool PikachuAudioMeterAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto& mainIn = layouts.getMainInputChannelSet();
    const auto& mainOut = layouts.getMainOutputChannelSet();
    return (mainIn == juce::AudioChannelSet::stereo() || mainIn == juce::AudioChannelSet::mono())
           && mainIn == mainOut;
}

void PikachuAudioMeterAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    if (numSamples == 0) return;

    float maxL = 0.0f;
    float maxR = 0.0f;
    float sumSqL = 0.0f;
    float sumSqR = 0.0f;

    if (numChannels >= 1)
    {
        auto* chL = buffer.getReadPointer (0);
        for (int i = 0; i < numSamples; ++i)
        {
            float v = std::abs (chL[i]);
            if (v > maxL) maxL = v;
            sumSqL += v * v;
        }
    }
    if (numChannels >= 2)
    {
        auto* chR = buffer.getReadPointer (1);
        for (int i = 0; i < numSamples; ++i)
        {
            float v = std::abs (chR[i]);
            if (v > maxR) maxR = v;
            sumSqR += v * v;
        }
    }
    else
    {
        maxR = maxL;
        sumSqR = sumSqL;
    }

    auto toDb = [] (float val) {
        return val > 0.00001f ? 20.0f * std::log10 (val) : -60.0f;
    };
    auto toRmsDb = [] (float sumSq, int samples) {
        return sumSq > 0.000001f ? 10.0f * std::log10 (sumSq / (float)samples) : -60.0f;
    };

    leftPeakDb.store (toDb (maxL));
    rightPeakDb.store (toDb (maxR));
    leftRmsDb.store (toRmsDb (sumSqL, numSamples));
    rightRmsDb.store (toRmsDb (sumSqR, numSamples));
}

juce::AudioProcessorEditor* PikachuAudioMeterAudioProcessor::createEditor()
{
    return new PikachuAudioMeterEditor (*this);
}

//==============================================================================
// JUCE 插件必需的全局启动函数（没有它链接器会报 exit code 2）
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new PikachuAudioMeterAudioProcessor();
}
