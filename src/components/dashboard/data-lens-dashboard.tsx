"use client";

import type { ChangeEvent } from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  UploadCloud,
  TableIcon,
  BarChartBig,
  LineChart as LineChartIcon, // Renamed to avoid conflict with Recharts' LineChart
  PieChartIcon,
  ScatterChart as ScatterChartIcon, // Renamed
  Sparkles,
  FileText,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { ParsedExcelData } from "@/app/actions/excel";
import { parseExcelFile } from "@/app/actions/excel";
import { generateDataInsights } from "@/ai/flows/generate-data-insights";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend as RechartsLegend, // Keep direct Recharts Legend for specific cases if needed, or remove
  Tooltip as RechartsTooltip, // Keep direct Recharts Tooltip for specific cases if needed, or remove
  Line,
  PieChart,
  Pie,
  Cell as RechartsCell,
  Scatter,
  ZAxis,
  LineChart, // Recharts LineChart component
  ScatterChart as RechartsScatterChart, // Recharts ScatterChart component
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";


type ChartType = "bar" | "line" | "pie" | "scatter";

const CHART_TYPES: { value: ChartType; label: string; icon: React.ElementType }[] = [
  { value: "bar", label: "Bar Chart", icon: BarChartBig },
  { value: "line", label: "Line Chart", icon: LineChartIcon },
  { value: "pie", label: "Pie Chart", icon: PieChartIcon },
  { value: "scatter", label: "Scatter Chart", icon: ScatterChartIcon },
];

// PIE_CHART_COLORS can be used if specific colors are needed beyond the 5 theme chart colors.
// const PIE_CHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560", "#775DD0"];


export function DataLensDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null);
  const [selectedXAxis, setSelectedXAxis] = useState<string | null>(null);
  const [selectedYAxis, setSelectedYAxis] = useState<string | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>("bar");
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState({ parsing: false, generatingInsights: false });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(null);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setIsLoading(prev => ({ ...prev, parsing: true }));
    setError(null);
    setParsedData(null); 
    setSelectedXAxis(null);
    setSelectedYAxis(null);
    setAiInsights(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await parseExcelFile(formData);
      if (result.error) {
        setError(result.error);
        toast({ variant: "destructive", title: "Parsing Error", description: result.error });
      } else if (result.rows.length === 0 && result.headers.length > 0) {
         setParsedData(result);
         toast({ title: "File Processed", description: "File parsed, but no data rows found. Headers are available." });
      } else if (result.rows.length === 0 && result.headers.length === 0) {
        setError("The file is empty or does not contain valid data.");
        toast({ variant: "destructive", title: "Empty File", description: "No headers or data found in the file." });
      }
      else {
        setParsedData(result);
        setFileName(result.fileName || file.name);
        toast({ title: "File Uploaded", description: `${result.fileName || file.name} parsed successfully.` });
        if (result.headers.length > 0) setSelectedXAxis(result.headers[0]);
        if (result.headers.length > 1) setSelectedYAxis(result.headers[1]);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during file parsing.";
      setError(errorMessage);
      toast({ variant: "destructive", title: "Upload Failed", description: errorMessage });
    } finally {
      setIsLoading(prev => ({ ...prev, parsing: false }));
    }
  };
  
  const handleClearData = () => {
    setFile(null);
    setFileName(null);
    setParsedData(null);
    setSelectedXAxis(null);
    setSelectedYAxis(null);
    setShowAiInsights(false);
    setAiInsights(null);
    setError(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    toast({ title: "Data Cleared", description: "All data and selections have been reset." });
  };

  const handleGenerateInsights = useCallback(async () => {
    if (!parsedData || parsedData.rows.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "Cannot generate insights without data." });
      setShowAiInsights(false);
      return;
    }
    setIsLoading(prev => ({ ...prev, generatingInsights: true }));
    setAiInsights(null);
    setError(null);

    try {
      const dataForInsights = JSON.stringify(parsedData.rows.slice(0, 50));
      const result = await generateDataInsights({ excelData: dataForInsights });
      setAiInsights(result.insights);
      toast({ title: "AI Insights Generated", description: "Insights have been successfully generated." });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while generating insights.";
      setError("Failed to generate AI insights. " + errorMessage);
      toast({ variant: "destructive", title: "AI Insights Failed", description: errorMessage });
      setShowAiInsights(false);
    } finally {
      setIsLoading(prev => ({ ...prev, generatingInsights: false }));
    }
  }, [parsedData, toast]);

  useEffect(() => {
    if (showAiInsights && parsedData && parsedData.rows.length > 0 && !aiInsights) {
      handleGenerateInsights();
    }
  }, [showAiInsights, parsedData, aiInsights, handleGenerateInsights]);

  const chartData = useMemo(() => {
    if (!parsedData || !selectedXAxis || !selectedYAxis || parsedData.rows.length === 0) {
      return [];
    }
    
    if (selectedChartType === "pie") {
      const counts: Record<string, number> = {};
      parsedData.rows.forEach(row => {
        const category = String(row[selectedXAxis!]); // selectedXAxis is checked
        const value = parseFloat(row[selectedYAxis!]); // selectedYAxis is checked
        if (!isNaN(value)) {
          counts[category] = (counts[category] || 0) + value;
        }
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }

    return parsedData.rows.map(row => ({
      [selectedXAxis!]: row[selectedXAxis!],
      [selectedYAxis!]: parseFloat(String(row[selectedYAxis!])), 
    })).filter(item => !isNaN(item[selectedYAxis!]));
  }, [parsedData, selectedXAxis, selectedYAxis, selectedChartType]);

  const chartConfig = useMemo(() => {
    if (!selectedYAxis) return {} as ChartConfig;

    if (selectedChartType === 'pie') {
        // For Pie, dataKey is "value", nameKey is "name".
        // The legend will pick up "name" and its color from the Cell.
        // Tooltip will also pick up "name" and "value".
        // So, a generic config for 'value' might be useful for styling the "value" if referenced directly.
        return {
             value: { label: selectedYAxis, color: `hsl(var(--chart-1))` }
        } satisfies ChartConfig;
    }

    return {
      [selectedYAxis]: {
        label: selectedYAxis,
        color: `hsl(var(--chart-1))`,
      },
    } satisfies ChartConfig;
  }, [selectedYAxis, selectedChartType]);


  const renderChart = () => {
    if (!parsedData || chartData.length === 0 || !selectedXAxis || !selectedYAxis) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <BarChartBig className="w-16 h-16 mb-4" />
          <p>Upload data and select axes to display chart.</p>
        </div>
      );
    }
    
    const yDataIsNumeric = chartData.every(d => typeof d[selectedChartType === 'pie' ? 'value' : selectedYAxis!] === 'number' && !isNaN(d[selectedChartType === 'pie' ? 'value' : selectedYAxis!]));
    if (!yDataIsNumeric && selectedChartType !== 'scatter') { // Scatter X can be category
        return <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Invalid Y-Axis Data</AlertTitle>
            <AlertDescription>The selected Y-axis ({selectedYAxis}) does not contain numeric data suitable for a {selectedChartType} chart.</AlertDescription>
        </Alert>;
    }

    return (
      <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
        <ResponsiveContainer width="100%" height={400}>
          {selectedChartType === "bar" && (
            <BarChart data={chartData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={selectedXAxis!} tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickMargin={10} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey={selectedYAxis!} fill={`var(--color-${selectedYAxis!})`} radius={4} />
            </BarChart>
          )}
          {selectedChartType === "line" && (
            <LineChart data={chartData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={selectedXAxis!} tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickMargin={10} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey={selectedYAxis!} stroke={`var(--color-${selectedYAxis!})`} strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          )}
          {selectedChartType === "pie" && (
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name"/>} />
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return ( (percent * 100) > 5 ? // Only show label if slice is > 5%
                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                      {`${name} (${(percent * 100).toFixed(0)}%)`}
                    </text> : null
                  );
                }}>
                {chartData.map((entry, index) => (
                  <RechartsCell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          )}
          {selectedChartType === "scatter" && (
            <RechartsScatterChart data={chartData} accessibilityLayer>
              <CartesianGrid />
              <XAxis type="category" dataKey={selectedXAxis!} name={selectedXAxis!} tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis type="number" dataKey={selectedYAxis!} name={selectedYAxis!} tickLine={false} axisLine={false} tickMargin={10} />
              <ZAxis range={[60, 400]} /> {/* for bubble size if needed */}
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Scatter name={fileName || "Dataset"} data={chartData} fill={`var(--color-${selectedYAxis!})`} />
            </RechartsScatterChart>
          )}
        </ResponsiveContainer>
      </ChartContainer>
    );
  };


  return (
    <div className="space-y-6 p-4 md:p-8">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <UploadCloud className="w-7 h-7 mr-2 text-primary" /> Upload Excel File
          </CardTitle>
          <CardDescription>
            Upload an .xls, .xlsx, or .csv file to analyze and visualize its data. Max file size: 5MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Input id="file-upload" type="file" accept=".xls,.xlsx,.csv" onChange={handleFileChange} className="flex-grow" />
            <div className="flex gap-2">
              <Button onClick={handleFileUpload} disabled={isLoading.parsing || !file}>
                {isLoading.parsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading.parsing ? "Processing..." : "Process File"}
              </Button>
              {parsedData && (
                <Button onClick={handleClearData} variant="outline" disabled={isLoading.parsing}>
                  <Trash2 className="mr-2 h-4 w-4" /> Clear Data
                </Button>
              )}
            </div>
          </div>
          {fileName && !isLoading.parsing && (
             <p className="text-sm text-muted-foreground flex items-center"><FileText className="w-4 h-4 mr-2"/>Current file: {fileName}</p>
          )}
        </CardContent>
      </Card>

      {isLoading.parsing && (
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Loading Data...</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      )}
      
      {parsedData && !isLoading.parsing && (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <TableIcon className="w-7 h-7 mr-2 text-primary" /> Data Table
              </CardTitle>
              <CardDescription>
                Preview of the uploaded data. Select columns for X and Y axes for charting. Displaying top 100 rows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parsedData.rows.length === 0 && parsedData.headers.length > 0 ? (
                 <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Data Rows</AlertTitle>
                    <AlertDescription>The file contains headers but no data rows to display in the table or chart.</AlertDescription>
                 </Alert>
              ) : parsedData.rows.length > 0 ? (
                <ScrollArea className="h-[400px] w-full rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background shadow-sm">
                      <TableRow>
                        {parsedData.headers.map(header => (
                          <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.rows.slice(0, 100).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {parsedData.headers.map(header => (
                            <TableCell key={`${rowIndex}-${header}`} className="whitespace-nowrap">
                              {String(row[header])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No Data Available</AlertTitle>
                  <AlertDescription>The parsed file does not contain any data to display.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          {parsedData.rows.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <BarChartBig className="w-7 h-7 mr-2 text-primary" /> Chart Visualization
                </CardTitle>
                <CardDescription>
                  Select axes and chart type to visualize your data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label htmlFor="x-axis-select">X-Axis</Label>
                    <Select value={selectedXAxis || ""} onValueChange={setSelectedXAxis}>
                      <SelectTrigger id="x-axis-select">
                        <SelectValue placeholder="Select X-axis" />
                      </SelectTrigger>
                      <SelectContent>
                        {parsedData.headers.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="y-axis-select">Y-Axis</Label>
                    <Select value={selectedYAxis || ""} onValueChange={setSelectedYAxis}>
                      <SelectTrigger id="y-axis-select">
                        <SelectValue placeholder="Select Y-axis" />
                      </SelectTrigger>
                      <SelectContent>
                        {parsedData.headers.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="chart-type-select">Chart Type</Label>
                    <Select value={selectedChartType} onValueChange={(value) => setSelectedChartType(value as ChartType)}>
                      <SelectTrigger id="chart-type-select">
                        <SelectValue placeholder="Select chart type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHART_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center">
                              <type.icon className="w-4 h-4 mr-2" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="min-h-[400px] border rounded-md p-4 bg-card">
                  {renderChart()}
                </div>
              </CardContent>
            </Card>
          )}

          {parsedData.rows.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Sparkles className="w-7 h-7 mr-2 text-primary" /> AI Data Insights
                </CardTitle>
                <CardDescription>
                  Toggle to generate summary insights from your data using AI. (Analyzes up to first 50 rows)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    id="ai-insights-toggle"
                    checked={showAiInsights}
                    onCheckedChange={setShowAiInsights}
                    disabled={isLoading.generatingInsights}
                  />
                  <Label htmlFor="ai-insights-toggle">Enable AI Insights</Label>
                </div>
                {isLoading.generatingInsights && (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                )}
                {!isLoading.generatingInsights && aiInsights && (
                  <div className="p-4 bg-muted/50 rounded-md border">
                    <p className="text-sm whitespace-pre-wrap">{aiInsights}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
