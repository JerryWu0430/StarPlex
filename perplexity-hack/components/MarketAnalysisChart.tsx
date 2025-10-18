"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, TooltipProps } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { analyzeTrends, type TrendsAnalysisResponse } from "@/lib/api";
import { useStartup } from "@/contexts/StartupContext";

interface MarketAnalysisChartProps {
  location: string;
  startupIdea: string;
}

// Helper function to parse location and extract region
function parseLocationToRegion(location: string): string {
  // For city-level analysis, we'll pass the full location string
  // This allows the backend to handle city-specific trends
  return location;
}

// Helper function to transform Google Trends data for chart
function transformTrendsData(trendsData: TrendsAnalysisResponse['google_trends_data']) {
  const chartData: Array<{ [key: string]: any }> = [];
  
  // The backend returns data in format: [{year: "2020", "query1_sum": value, "query2_sum": value, ...}, ...]
  const trendsArray = trendsData.trends_data || [];
  
  // Transform each year's data into chart format
  trendsArray.forEach((yearData: any) => {
    const dataPoint: { [key: string]: any } = {
      year: yearData.year,
      formattedTime: yearData.year.toString()
    };
    
    // Add each query's sum value to the data point
    Object.keys(yearData).forEach(key => {
      if (key !== 'year' && key.endsWith('_sum')) {
        // Convert "query_sum" to "query" for the chart
        const queryName = key.replace('_sum', '');
        dataPoint[queryName] = yearData[key] || 0;
      }
    });
    
    chartData.push(dataPoint);
  });
  
  return chartData;
}

// Generate chart config for dynamic keywords with distinct colors
function generateChartConfig(keywords: string[]): ChartConfig {
  const config: ChartConfig = {};
  const colors = [
    "hsl(220, 70%, 50%)", // Blue
    "hsl(0, 70%, 50%)",   // Red
    "hsl(120, 70%, 50%)", // Green
    "hsl(60, 70%, 50%)",  // Yellow
    "hsl(300, 70%, 50%)", // Purple
    "hsl(30, 70%, 50%)",  // Orange
    "hsl(180, 70%, 50%)", // Cyan
    "hsl(270, 70%, 50%)", // Magenta
    "hsl(90, 70%, 50%)",  // Light Green
    "hsl(15, 70%, 50%)"   // Dark Orange
  ];
  
  keywords.forEach((keyword, index) => {
    config[keyword] = {
      label: keyword,
      color: colors[index % colors.length],
    };
  });
  
  return config;
}

// Custom tooltip component that shows only the highlighted line
const CustomTooltip = ({ active, payload, label, chartConfig }: TooltipProps<any, any> & { chartConfig: ChartConfig }) => {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg min-w-[200px]">
        <p className="text-white font-medium mb-2">{`Year: ${label}`}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-300">{formatKeyword(String(entry.dataKey || ''))}:</span>
            <span className="text-white font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Helper function to format keywords with proper spacing
function formatKeyword(keyword: string): string {
  // Convert camelCase or lowercase words to proper spacing
  return keyword
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to space
    .replace(/([a-z])([0-9])/g, '$1 $2') // letter followed by number
    .replace(/([0-9])([a-z])/g, '$1 $2') // number followed by letter
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper function to format market cap
function formatMarketCap(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(1)}T`;
  } else if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(1)}K`;
  } else {
    return `$${value.toFixed(0)}`;
  }
}

export function MarketAnalysisChart({ location, startupIdea }: MarketAnalysisChartProps) {
  const [data, setData] = useState<TrendsAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { keywords, marketAnalysis } = useStartup();

  useEffect(() => {
    const fetchTrendsData = async () => {
      if (!keywords.length || !location.trim()) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const region = parseLocationToRegion(location);
        const result = await analyzeTrends(keywords, region);
        setData(result);
      } catch (err) {
        console.error('Error fetching trends analysis:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch trends data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendsData();
  }, [location, keywords]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Trends Analysis</CardTitle>
          <CardDescription>Loading market data for {location}...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Trends Analysis</CardTitle>
          <CardDescription>Error loading market data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.google_trends_data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Trends Analysis</CardTitle>
          <CardDescription>No market data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>No trends data found for this location. Make sure to enter a startup idea first.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = transformTrendsData(data.google_trends_data);
  // Use keywords from context or fallback to response keywords
  const chartKeywords = keywords.length > 0 ? keywords : (data.google_trends_data.queries_analyzed || []);
  const chartConfig = generateChartConfig(chartKeywords);

  // Calculate trend direction
  const getTrendDirection = () => {
    if (chartData.length < 2) return 'neutral';
    
    const firstValue = chartData[0];
    const lastValue = chartData[chartData.length - 1];
    
    let totalChange = 0;
    let count = 0;
    
    chartKeywords.forEach((keyword: string) => {
      if (firstValue[keyword] && lastValue[keyword]) {
        totalChange += (lastValue[keyword] - firstValue[keyword]) / firstValue[keyword];
        count++;
      }
    });
    
    const avgChange = count > 0 ? totalChange / count : 0;
    
    if (avgChange > 0.1) return 'up';
    if (avgChange < -0.1) return 'down';
    return 'neutral';
  };

  const trendDirection = getTrendDirection();
  const trendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : null;
  const trendText = trendDirection === 'up' ? 'trending up' : trendDirection === 'down' ? 'trending down' : 'stable';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Trends Analysis</CardTitle>
        <CardDescription>
          Search interest trends for {data.region} region
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedTime"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip 
                content={<CustomTooltip chartConfig={chartConfig} />}
                position={{ x: 200, y: -50 }}
                allowEscapeViewBox={{ x: true, y: true }}
                cursor={false}
                wrapperStyle={{ 
                  outline: 'none',
                  zIndex: 1000
                }}
              />
              <defs>
                {keywords.map((keyword, index) => (
                  <linearGradient key={keyword} id={`fill${keyword}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={chartConfig[keyword]?.color || `hsl(${index * 40}, 70%, 50%)`}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={chartConfig[keyword]?.color || `hsl(${index * 40}, 70%, 50%)`}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              {keywords.map((keyword, index) => (
                <Area
                  key={keyword}
                  type="monotone"
                  dataKey={keyword}
                  stroke={chartConfig[keyword]?.color || `hsl(${index * 40}, 70%, 50%)`}
                  fill={`url(#fill${keyword})`}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardContent>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Market interest {trendText} 
              {trendIcon && React.createElement(trendIcon, { className: "h-4 w-4" })}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Based on {chartKeywords.length} industry keywords
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {chartKeywords.map((keyword: string, index: number) => (
                <div key={keyword} className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: chartConfig[keyword]?.color || `hsl(${index * 40}, 70%, 50%)` }}
                  />
                  <span className="text-muted-foreground">{formatKeyword(keyword)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Market Analysis Section */}
        {marketAnalysis && (
          <div className="mt-6 space-y-6">
            {/* Market Cap Display */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                Market Cap
              </div>
              <div className="text-4xl font-bold text-green-700">
                {formatMarketCap(marketAnalysis.market_cap_estimation)}
              </div>
            </div>
            
            {/* FutureProof Scale */}
            <div className="text-center">
              <div className="text-lg font-semibold mb-4">Future-Proof Score</div>
              <div className="relative">
                {/* Scale Background */}
                <div className="w-full h-8 bg-gray-200 rounded-full relative overflow-hidden">
                  {/* Gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full"></div>
                  
                  {/* Scale markers */}
                  <div className="absolute inset-0 flex justify-between items-center px-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <div key={num} className="w-0.5 h-4 bg-white rounded-full"></div>
                    ))}
                  </div>
                  
                  {/* Score indicator */}
                  <div 
                    className="absolute top-0 w-6 h-8 bg-white border-2 border-gray-800 rounded-full transform -translate-x-1/2 shadow-lg"
                    style={{ 
                      left: `${((marketAnalysis.how_AI_proof_it_is - 1) / 9) * 100}%` 
                    }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm font-bold text-gray-800">
                      {marketAnalysis.how_AI_proof_it_is}
                    </div>
                  </div>
                </div>
                
                {/* Scale labels */}
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                  <span>High AI Risk</span>
                  <span>AI Resilient</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
