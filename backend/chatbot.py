from perplexity import Perplexity
from typing import List, Dict, Optional
import json

class ChatbotAssistant:
    def __init__(self):
        self.client = Perplexity()
        self.conversation_history: List[Dict[str, str]] = []
        self.business_context = ""
        self.additional_context: Dict = {}
    
    def set_business_context(self, business_idea: str):
        """Set the business idea context for the chatbot"""
        self.business_context = business_idea
        self.conversation_history = []  # Reset conversation when context changes
    
    def set_additional_context(self, vcs: Optional[List] = None, cofounders: Optional[List] = None, 
                              competitors: Optional[List] = None, demographics: Optional[Dict] = None):
        """Set additional context from market research data"""
        self.additional_context = {
            "vcs": vcs or [],
            "cofounders": cofounders or [],
            "competitors": competitors or [],
            "demographics": demographics or {}
        }
    
    async def chat(self, user_message: str) -> str:
        """
        Send user message to Sonar Pro and get response with business context
        
        Args:
            user_message: The user's question or message
            
        Returns:
            The AI assistant's response with markdown formatting
        """
        # Build context summary from additional data
        context_summary = self._build_context_summary()
        
        # Build system prompt with business context
        system_prompt = f"""You are a helpful startup advisor assistant with access to market research data.

The user is working on the following business idea:
{self.business_context}

{context_summary}

Your role is to:
- Be friendly and conversational - respond naturally to greetings and casual messages
- Answer questions about their startup idea using the data provided
- Provide market insights and advice based on the research data
- Help with strategy, competitors, customer demographics, fundraising, etc.
- Format your responses using Markdown for better readability:
  * Use **bold** for emphasis on key points
  * Use bullet points (- or *) for lists
  * Use numbered lists (1., 2., 3.) for ordered items or steps
  * Use `code` formatting for technical terms or company names when appropriate
  * Use > for important quotes or callouts
  * Use ### for section headers when appropriate
- Be concise but informative
- Stay focused on helping them build and grow their startup
- When referencing market research data, mention specific names, numbers, and scores naturally in your response
- DO NOT use citation numbers like [1][2][3] - speak naturally and reference data directly

For simple greetings or casual messages, respond warmly and ask how you can help with their startup."""

        # Add user message to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })
        
        # Build messages array with system prompt and conversation history
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history (keep last 10 messages to avoid token limits)
        messages.extend(self.conversation_history[-10:])
        
        try:
            # Call Perplexity Sonar Pro
            response = self.client.chat.completions.create(
                model="sonar-pro",
                messages=messages,
                temperature=0.7,
                stream=False
            )
            
            assistant_message = response.choices[0].message.content
            
            # Add assistant response to conversation history
            self.conversation_history.append({
                "role": "assistant",
                "content": assistant_message
            })
            
            return assistant_message
            
        except Exception as e:
            error_message = f"Error communicating with AI: {str(e)}"
            print(error_message)
            return error_message
    
    def get_conversation_history(self) -> List[Dict[str, str]]:
        """Get the full conversation history"""
        return self.conversation_history
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
    
    def _build_context_summary(self) -> str:
        """Build a context summary from available market research data"""
        context_parts = []
        
        # VCs context
        if self.additional_context.get("vcs"):
            vcs = self.additional_context["vcs"]
            vc_count = len(vcs)
            if vc_count > 0:
                top_vcs = vcs[:5]  # Top 5 VCs
                vc_names = [f"{vc.get('name', 'Unknown')} at {vc.get('firm', 'Unknown')}" for vc in top_vcs]
                context_parts.append(f"""
**Available VCs ({vc_count} total):**
Top matches: {', '.join(vc_names)}
""")
        
        # Cofounders context
        if self.additional_context.get("cofounders"):
            cofounders = self.additional_context["cofounders"]
            cofounder_count = len(cofounders)
            if cofounder_count > 0:
                top_cofounders = cofounders[:5]  # Top 5 cofounders
                cofounder_names = [cf.get('name', 'Unknown') for cf in top_cofounders]
                context_parts.append(f"""
**Potential Cofounders ({cofounder_count} total):**
Top matches: {', '.join(cofounder_names)}
""")
        
        # Competitors context
        if self.additional_context.get("competitors"):
            competitors = self.additional_context["competitors"]
            competitor_count = len(competitors)
            if competitor_count > 0:
                top_competitors = competitors[:5]  # Top 5 competitors
                competitor_names = [comp.get('company_name', 'Unknown') for comp in top_competitors]
                context_parts.append(f"""
**Market Competitors ({competitor_count} total):**
Top threats: {', '.join(competitor_names)}
""")
        
        # Demographics context
        if self.additional_context.get("demographics"):
            demographics = self.additional_context["demographics"]
            if demographics.get("features"):
                location_count = len(demographics["features"])
                context_parts.append(f"""
**Customer Demographics:**
{location_count} target locations identified with demographic data
""")
        
        if context_parts:
            return "\n**Market Research Data Available:**\n" + "\n".join(context_parts)
        else:
            return "\n**Market Research Data:** Loading or not yet available.\n"


# Global chatbot instance (can be enhanced to support multiple users with session management)
chatbot = ChatbotAssistant()


async def chat_with_assistant(business_idea: str, message: str, 
                              vcs: Optional[List] = None, 
                              cofounders: Optional[List] = None,
                              competitors: Optional[List] = None,
                              demographics: Optional[Dict] = None) -> Dict:
    """
    API function to chat with the assistant
    
    Args:
        business_idea: The user's startup idea (for context)
        message: The user's message/question
        vcs: List of VC data from market research
        cofounders: List of cofounder data from market research
        competitors: List of competitor data from market research
        demographics: Demographics data from market research
        
    Returns:
        Dictionary with response and conversation history
    """
    # Set or update business context
    if business_idea and business_idea != chatbot.business_context:
        chatbot.set_business_context(business_idea)
    
    # Set additional context from market research
    chatbot.set_additional_context(
        vcs=vcs,
        cofounders=cofounders,
        competitors=competitors,
        demographics=demographics
    )
    
    # Get response from chatbot
    response = await chatbot.chat(message)
    
    return {
        "success": True,
        "response": response,
        "conversation_history": chatbot.get_conversation_history()
    }
