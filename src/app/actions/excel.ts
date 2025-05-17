"use server";

import * as XLSX from "xlsx";
import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

const FileSchema = z.object({
  file: z
    .any()
    .refine((file) => file instanceof File, "File is required.")
    .refine((file) => file?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => ALLOWED_FILE_TYPES.includes(file?.type),
      "Only .xls, .xlsx, and .csv files are accepted."
    ),
});

export interface ParsedExcelData {
  headers: string[];
  rows: Record<string, any>[];
  error?: string;
  fileName?: string;
}

export async function parseExcelFile(formData: FormData): Promise<ParsedExcelData> {
  const file = formData.get("file");

  const validationResult = FileSchema.safeParse({ file });
  if (!validationResult.success) {
    return { headers: [], rows: [], error: validationResult.error.errors.map(e => e.message).join(', ') };
  }

  const validatedFile = validationResult.data.file as File;

  try {
    const arrayBuffer = await validatedFile.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      header: 1, // Use this to get array of arrays
      defval: "", // Default value for empty cells
    });

    if (!jsonData || jsonData.length === 0) {
      return { headers: [], rows: [], error: "The Excel file is empty or could not be read." };
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1).map((rowArray: any[]) => {
      const rowObject: Record<string, any> = {};
      headers.forEach((header, index) => {
        rowObject[header] = rowArray[index];
      });
      return rowObject;
    });
    
    // Filter out rows that are entirely empty
    const filteredRows = rows.filter(row => Object.values(row).some(value => value !== null && value !== undefined && value !== ""));

    if (filteredRows.length === 0 && headers.length > 0 && jsonData.length > 1) {
         // This case means headers exist, but all data rows were empty after parsing
         // Potentially keep headers only if user wants to see structure of an empty sheet
    }


    return { headers, rows: filteredRows, fileName: validatedFile.name };
  } catch (error) {
    console.error("Error parsing Excel file:", error);
    return { headers: [], rows: [], error: "Failed to parse the Excel file. Please ensure it's a valid .xls, .xlsx, or .csv file." };
  }
}
