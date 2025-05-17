"use client";

import type { ChangeEvent } from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  UploadCloud,
  TableIcon,
  BarChartBig,
  LineChart,
  PieChartIcon,
  ScatterChart,
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
  Tooltip as RechartsTooltip,
  Legend,
  Line,
  PieChart,
  Pie,
  Cell as RechartsCell,
  Scatter,
  ZAxis,
} from "recharts";

type ChartType = "bar" | "line" | "pie" | "scatter";

const CHART_TYPES: { value: ChartType; label: string; icon: React.ElementType }[] = [
  { value: "bar", label: "Bar Chart", icon: BarChartBig },
  { value: "line", label: "Line Chart", icon: LineChart },
  { value: "pie", label: "Pie Chart", icon: PieChartIcon },
  { value: "scatter", label: "Scatter Chart", icon: ScatterChart },
];

const CHART_COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F", "#FFBB28", "#FF8042"];

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
      setError(null); // Clear previous errors
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setIsLoading(prev => ({ ...prev, parsing: true }));
    setError(null);
    setParsedData(null); // Clear previous data
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
        // Auto-select first two columns if available
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
    // Reset file input
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
      const dataForInsights = JSON.stringify(parsedData.rows.slice(0, 50)); // Send a sample for brevity
      const result = await generateDataInsights({ excelData: dataForInsights });
      setAiInsights(result.insights);
      toast({ title: "AI Insights Generated", description: "Insights have been successfully generated." });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while generating insights.";
      setError("Failed to generate AI insights. " + errorMessage);
      toast({ variant: "destructive", title: "AI Insights Failed", description: errorMessage });
      setShowAiInsights(false); // Toggle back if error
    } finally {
      setIsLoading(prev => ({ ...prev, generatingInsights: false }));
    }
  }, [parsedData, toast]);

  useEffect(() => {
    if (showAiInsights && parsedData && parsedData.rows.length > 0 && !aiInsights) {
      handleGenerateInsights();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAiInsights, parsedData, aiInsights]); // handleGenerateInsights is memoized

  const chartData = useMemo(() => {
    if (!parsedData || !selectedXAxis || !selectedYAxis || parsedData.rows.length === 0) {
      return [];
    }
    
    if (selectedChartType === "pie") {
      const counts: Record<string, number> = {};
      parsedData.rows.forEach(row => {
        const category = String(row[selectedXAxis]);
        const value = parseFloat(row[selectedYAxis]);
        if (!isNaN(value)) {
          counts[category] = (counts[category] || 0) + value;
        }
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }

    return parsedData.rows.map(row => ({
      [selectedXAxis]: row[selectedXAxis],
      [selectedYAxis]: selectedChartType !== 'scatter' ? parseFloat(String(row[selectedYAxis])) : parseFloat(String(row[selectedYAxis])),
      // For scatter, Y can also be categorical, but typically numeric. Ensure parseFloat for all numeric axes.
    })).filter(item => selectedChartType === 'scatter' || !isNaN(item[selectedYAxis]));
  }, [parsedData, selectedXAxis, selectedYAxis, selectedChartType]);


  const renderChart = () => {
    if (!parsedData || chartData.length === 0 || !selectedXAxis || !selectedYAxis) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <BarChartBig className="w-16 h-16 mb-4" />
          <p>Upload data and select axes to display chart.</p>
        </div>
      );
    }
    
    // Check if Y-axis data is numeric for charts that require it
    const yDataIsNumeric = chartData.every(d => typeof d[selectedYAxis] === 'number' && !isNaN(d[selectedYAxis]));
    if (selectedChartType !== 'pie' && selectedChartType !== 'scatter' && !yDataIsNumeric) {
         // Pie chart handles non-numeric Y by its nature (counts or sums)
         // Scatter can handle categorical Y, though less common. For simplicity, we assume numeric for now.
        return <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Invalid Y-Axis Data</AlertTitle>
            <AlertDescription>The selected Y-axis ({selectedYAxis}) does not contain numeric data suitable for a {selectedChartType} chart.</AlertDescription>
        </Alert>;
    }


    return (
      <ResponsiveContainer width="100%" height={400}>
        {selectedChartType === "bar" && (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={selectedXAxis} />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey={selectedYAxis} fill={CHART_COLORS[0]} />
          </BarChart>
        )}
        {selectedChartType === "line" && (
          <RechartsTooltip contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} wrapperClassName="rounded-md shadow-lg" />
        )}
        {selectedChartType === "pie" && (
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
              {chartData.map((entry, index) => (
                <RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend />
          </PieChart>
        )}
        {selectedChartType === "scatter" && (
          <ScatterChart>
            <CartesianGrid />
            <XAxis type="category" dataKey={selectedXAxis} name={selectedXAxis} />
            <YAxis type="number" dataKey={selectedYAxis} name={selectedYAxis} />
            <ZAxis range={[100]} /> {/* for bubble size if needed */}
            <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} />
            <Legend />
            <Scatter name={fileName || "Dataset"} data={chartData} fill={CHART_COLORS[0]} />
          </ScatterChart>
        )}
      </ResponsiveContainer>
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
