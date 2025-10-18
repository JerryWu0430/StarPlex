import { useEffect } from 'react';
import { useStartup } from '@/contexts/StartupContext';
import { extractKeywords } from '@/lib/api';

export function useBackgroundAPI(startupIdea: string) {
  const { setKeywords, setMarketAnalysis } = useStartup();

  useEffect(() => {
    if (!startupIdea.trim()) return;

    const fetchKeywordsAndAnalysis = async () => {
      try {
        console.log('Starting background API call for:', startupIdea);
        const keywordResponse = await extractKeywords(startupIdea);
        
        setKeywords(keywordResponse.industry_keywords_extracted);
        if (keywordResponse.market_analysis) {
          setMarketAnalysis(keywordResponse.market_analysis);
        }
        
        console.log('Background API call completed successfully');
      } catch (error) {
        console.error('Background API call failed:', error);
        // Don't show error to user, just log it
        // The user can still use the app without this data
      }
    };

    fetchKeywordsAndAnalysis();
  }, [startupIdea, setKeywords, setMarketAnalysis]);
}
