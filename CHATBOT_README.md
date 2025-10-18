# Chatbot Implementation

## Overview
The chatbot feature allows users to have an intelligent conversation about their startup idea with context-aware responses powered by Perplexity Sonar Pro. It includes **markdown formatting** for better readability and **market research context** from VCs, cofounders, competitors, and customer demographics.

## Features

### Backend (`backend/chatbot.py`)
- **Context-Aware Conversations**: The chatbot maintains awareness of the user's business idea throughout the conversation
- **Market Research Context**: Automatically includes data from:
  - VCs and investors
  - Potential cofounders
  - Market competitors
  - Customer demographics
- **Conversation History**: Keeps track of the last 10 messages to provide coherent, contextual responses
- **Markdown Formatting**: Responses are formatted with markdown for better structure and readability
- **Perplexity Sonar Pro Integration**: Uses the most advanced Sonar model for intelligent, helpful responses

### Frontend (`perplexity-hack/app/appPage.tsx` & `components/MarkdownRenderer.tsx`)
- **Upward Expansion**: Chat messages expand upward from the input box, keeping the input at the bottom
- **Markdown Rendering**: AI responses support:
  - **Bold text** with `**text**`
  - `Code formatting` with backticks
  - Headers (# ## ###)
  - Bullet lists (- or *)
  - Numbered lists (1. 2. 3.)
  - Blockquotes (>)
  - Links [text](url)
- **Real-time Updates**: Messages appear instantly as the user sends them
- **Loading States**: Shows a thinking indicator while waiting for AI responses
- **Context Integration**: Automatically sends cached market research data with each message
- **Quick Actions**: Dropdown menu with suggested questions about competitors, customers, VCs, and cofounders
- **Responsive Design**: Messages are color-coded (user messages in primary color, AI responses in card background with rich formatting)

## API Endpoint

### POST `/chat`
Send a message to the AI assistant

**Request Body:**
```json
{
  "business_idea": "AI-powered legal technology platform",
  "message": "What are my biggest competitors?",
  "vcs": [
    {"name": "John Smith", "firm": "Legal Tech Ventures", "match_score": 95}
  ],
  "cofounders": [
    {"name": "Jane Doe", "location": "San Francisco", "match_score": 88}
  ],
  "competitors": [
    {"company_name": "LegalZoom", "threat_score": 85}
  ],
  "demographics": {
    "features": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "**Market Competitors (1 total):**\n\nBased on the research data, **LegalZoom** is your main competitor with a threat score of 85.\n\n### Key Differentiators:\n- Focus on AI-powered features\n- Target small law firms specifically\n- Provide personalized solutions\n\n> Consider emphasizing your AI capabilities to stand out from traditional solutions.",
  "conversation_history": [
    {
      "role": "user",
      "content": "What are my biggest competitors?"
    },
    {
      "role": "assistant",
      "content": "**Market Competitors (1 total):**\n\nBased on the research data..."
    }
  ]
}
```

## How It Works

1. **User Input**: User types a question in the chat input box at the bottom of the screen
2. **Context Gathering**: The frontend automatically collects:
   - Business idea
   - User message
   - Cached VCs data
   - Cached cofounders data
   - Cached competitors data
   - Cached demographics data
3. **API Call**: All context is sent to the `/chat` endpoint
4. **Context Processing**: The backend builds a context summary with:
   - Number of VCs found with top matches
   - Number of cofounders found with top matches
   - Number of competitors found with top threats
   - Customer demographics location count
5. **System Prompt**: A system prompt is constructed that includes:
   - The user's business idea for context
   - Market research data summary
   - Instructions for the AI to act as a startup advisor
   - Markdown formatting guidelines
   - Guidelines to reference specific data points
6. **Conversation History**: Previous messages (up to 10) are included for context
7. **AI Response**: Perplexity Sonar Pro generates a markdown-formatted response with full context
8. **Markdown Rendering**: The response is parsed and rendered with proper formatting
9. **UI Update**: The formatted response appears in the chat, expanding upward

## UI Behavior

- **Collapsed State**: When no messages exist, only the input box is visible
- **Expanded State**: As messages are sent, they appear above the input box
- **Scroll Behavior**: Uses `flex-col-reverse` to make messages expand upward naturally
- **Latest Message**: Always shows the most recent message at the bottom (closest to input)
- **Visual Design**:
  - User messages: Right-aligned, primary color background
  - AI messages: Left-aligned, card background with border
  - Maximum height of 96 units (24rem) with scroll

## Testing

### Backend Test
```bash
cd backend
python test_chatbot.py
```

### Full Integration Test
1. Start the backend:
   ```bash
   cd backend
   python main.py
   ```

2. Start the frontend:
   ```bash
   cd perplexity-hack
   npm run dev
   ```

3. Enter a business idea on the init page
4. Type a message in the chat box
5. Press Enter or click the send button
6. Watch messages expand upward!

## Quick Actions
The dropdown menu provides these suggested prompts:
- "Tell me about my competitors" - Competitor Analysis
- "Who is my target customer?" - Customer Demographics
- "Which VCs should I target?" - VC Recommendations  
- "What skills should I look for in a cofounder?" - Cofounder Advice

## Technical Details

### State Management
- `chatMessages`: Array of ChatMessage objects with role and content
- `chatInput`: Current text in the input box
- `isChatExpanded`: Whether the chat history is visible
- `currentLoading`: Tracks if chat is waiting for response

### Error Handling
- Network errors show an error alert
- Failed responses add an error message to the chat
- Rate limits are handled with retry logic from the API utility

### Performance
- Uses `useRef` for textarea and container to avoid unnecessary re-renders
- Conversation history limited to 10 messages to prevent token limit issues
- Messages rendered with virtualization-friendly reverse flex
