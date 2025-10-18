"""
Simple test script for the chatbot functionality
Run this to verify the chatbot works before testing in the UI
"""

import asyncio
from chatbot import chat_with_assistant

async def test_chatbot():
    print("=" * 60)
    print("Testing Chatbot Implementation with Context")
    print("=" * 60)
    
    # Set a business idea
    business_idea = "AI-powered legal technology platform for small law firms"
    
    # Mock context data (simulate what the frontend would send)
    mock_vcs = [
        {"name": "John Smith", "firm": "Legal Tech Ventures", "match_score": 95},
        {"name": "Jane Doe", "firm": "AI Investment Partners", "match_score": 88},
    ]
    
    mock_competitors = [
        {"company_name": "LegalZoom", "threat_score": 85},
        {"company_name": "Clio", "threat_score": 78},
    ]
    
    # Test 1: First message with context
    print(f"\nBusiness Idea: {business_idea}")
    print(f"\nContext: {len(mock_vcs)} VCs, {len(mock_competitors)} competitors")
    print("\n" + "-" * 60)
    
    message1 = "What are the biggest challenges in this market and who are my main competitors?"
    print(f"User: {message1}")
    
    result1 = await chat_with_assistant(
        business_idea, 
        message1,
        vcs=mock_vcs,
        competitors=mock_competitors
    )
    print(f"\nAssistant (with markdown):\n{result1['response']}")
    print(f"\nConversation length: {len(result1['conversation_history'])} messages")
    
    # Test 2: Follow-up message (should have context)
    print("\n" + "-" * 60)
    message2 = "Which VCs should I approach first?"
    print(f"User: {message2}")
    
    result2 = await chat_with_assistant(
        business_idea, 
        message2,
        vcs=mock_vcs,
        competitors=mock_competitors
    )
    print(f"\nAssistant (with markdown):\n{result2['response']}")
    print(f"\nConversation length: {len(result2['conversation_history'])} messages")
    
    print("\n" + "=" * 60)
    print("✅ Chatbot test completed successfully!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_chatbot())
