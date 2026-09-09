cmake_minimum_required(VERSION 3.22)
project(PikachuAudioMeter VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# macOS Universal 2 (Apple Silicon M1/M2/M3/M4 + Intel x86_64)
set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "" FORCE)
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "" FORCE)

# If JUCE is not already added, find or add it
if(NOT TARGET juce::juce_audio_utils)
    add_subdirectory(JUCE)
endif()

juce_add_plugin(PikachuAudioMeter
    COMPANY_NAME "PikaLab"
    BUNDLE_ID "com.pikalab.pikachumeter"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    PLUGIN_MANUFACTURER_CODE "Pika"
    PLUGIN_CODE "PkMe"
    FORMATS AU VST3 Standalone
    PRODUCT_NAME "Pikachu Thunderbolt Audio Meter"
)

target_include_directories(PikachuAudioMeter PRIVATE Source)

target_sources(PikachuAudioMeter PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginProcessor.h
    Source/PluginEditor.cpp
    Source/PluginEditor.h
)

target_compile_definitions(PikachuAudioMeter PRIVATE
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
)

target_link_libraries(PikachuAudioMeter PRIVATE
    juce::juce_audio_utils
    juce::juce_audio_processors
    juce::juce_dsp
    juce::juce_gui_basics
    juce::juce_gui_extra
    PUBLIC
    juce::juce_recommended_config_flags
    juce::juce_recommended_warning_flags
)
