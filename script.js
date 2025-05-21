document.addEventListener('DOMContentLoaded', () => {
    const markdownFiles = [
        "ChatGLM4_20240821.md",
        "ESTsoft-alan_20230920.md",
        "README.md",
        "anthropic-claude-3-haiku_20240712.md",
        "anthropic-claude-3-opus_20240712.md",
        "anthropic-claude-3-sonnet_20240306.md",
        "anthropic-claude-3-sonnet_20240311.md",
        "anthropic-claude-3.5-sonnet_20240712.md",
        "anthropic-claude-3.5-sonnet_20240909.md",
        "anthropic-claude-3.5-sonnet_20241022.md",
        "anthropic-claude-3.5-sonnet_20241122.md",
        "anthropic-claude-3.7-sonnet_20250224.md",
        "anthropic-claude-api-tool-use_20250119.md",
        "anthropic-claude-opus_20240306.md",
        "anthropic-claude_2.0_20240306.md",
        "anthropic-claude_2.1_20240306.md",
        "bolt.new_20241009.md",
        "brave-leo-ai_20240601.md",
        "claude-artifacts_20240620.md",
        "codeium-windsurf-cascade-R1_20250201.md",
        "codeium-windsurf-cascade_20241206.md",
        "colab-ai_20240108.md",
        "colab-ai_20240511.md",
        "cursor-ide-agent-claude-sonnet-3.7_20250309.md",
        "cursor-ide-sonnet_20241224.md",
        "deepseek.ai_01.md",
        "devv_20240427.md",
        "discord-clyde_20230420.md",
        "discord-clyde_20230519.md",
        "discord-clyde_20230715.md",
        "discord-clyde_20230716-1.md",
        "discord-clyde_20230716-2.md",
        "gandalf_20230919.md",
        "github-copilot-chat_20230513.md",
        "github-copilot-chat_20240930.md",
        "google-gemini-1.5_20240411.md",
        "manus_20250309.md",
        "manus_20250310.md",
        "microsoft-bing-chat_20230209.md",
        "microsoft-copilot_20240310.md",
        "microsoft-copilot_20241219.md",
        "mistral-le-chat-pro-20250425.md",
        "moonshot-kimi-chat_20241106.md",
        "naver-cue_20230920.md",
        "notion-ai_20221228.md",
        "openai-assistants-api_20231106.md",
        "openai-chatgpt-ios_20230614.md",
        "openai-chatgpt4-android_20240207.md",
        "openai-chatgpt4o_20240520.md",
        "openai-chatgpt4o_20250324.md",
        "openai-chatgpt_20221201.md",
        "openai-dall-e-3_20231007-1.md",
        "openai-dall-e-3_20231007-2.md",
        "openai-deep-research_20250204.md",
        "opera-aria_20230617.md",
        "perplexity.ai_20221208.md",
        "perplexity.ai_20240311.md",
        "perplexity.ai_20240513.md",
        "perplexity.ai_20240607.md",
        "perplexity.ai_20250112.md",
        "perplexity.ai_gpt4_20240311.md",
        "phind_20240427.md",
        "remoteli-io_20230806.md",
        "roblox-studio-assistant_20240320.md",
        "snap-myai_20230430.md",
        "v0_20250306.md",
        "wrtn-gpt3.5_20240215.md",
        "wrtn-gpt4_20240215.md",
        "wrtn_20230603.md",
        "xAI-grok2_20241218.md",
        "xAI-grok2_20250111.md",
        "xAI-grok3_20250223.md",
        "xAI-grok3_20250423.md",
        "xAI-grok3_20250504.md",
        "xAI-grok3_20250509.md",
        "xAI-grok_20240307.md",
        "xAI-grok_20241003.md"
    ];

    const fileListDiv = document.getElementById('file-list');
    const contentDisplayDiv = document.getElementById('content-display');

    // Placeholder translation function
    function placeholderTranslate(htmlContent) {
        return `<h3>[Translated Content (Placeholder)]</h3>${htmlContent}`;
    }

    const ul = document.createElement('ul');
    fileListDiv.appendChild(ul);

    markdownFiles.forEach(filename => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = 'javascript:void(0);';
        a.textContent = filename;
        a.addEventListener('click', () => {
            fetch(filename) // Fetch the markdown file
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(markdownText => {
                    const originalHtml = marked.parse(markdownText);
                    contentDisplayDiv.innerHTML = placeholderTranslate(originalHtml); // Parse, translate (placeholder), and display
                })
                .catch(error => {
                    console.error('Error fetching or parsing markdown:', error);
                    contentDisplayDiv.innerHTML = `<p>Error loading file: ${filename}. Please check the console for details.</p>`;
                });
        });
        li.appendChild(a);
        ul.appendChild(li);
    });
});
