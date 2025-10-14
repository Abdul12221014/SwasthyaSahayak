/**
 * PHC Directory Tests
 * 
 * Tests PHC facility loading, CSV parsing, and nearest facility lookup.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.178.0/testing/asserts.ts";
import { stub } from "https://deno.land/std@0.178.0/testing/mock.ts";
import { findNearestFacilities, getFacilitiesByType, searchFacilities } from "@/backend/integrations/phc-directory.ts";

// Mock Deno.readTextFile for CSV loading
const mockReadTextFile = stub(Deno, "readTextFile");

Deno.test("findNearestFacilities - loads and returns facilities", async () => {
  // Mock CSV content
  const mockCSV = `name,type,address,phone,district,pincode,lat,lon
"Cuttack District Hospital","District Hospital","Cuttack, Odisha 753001","0671-2301234","Cuttack","753001","20.4625","85.8830"
"Bhubaneswar Capital Hospital","Medical College","Bhubaneswar, Odisha 751019","0674-2305678","Bhubaneswar","751019","20.2961","85.8245"
"Puri District Hospital","District Hospital","Puri, Odisha 752001","06752-223456","Puri","752001","19.8138","85.8315"`;

  mockReadTextFile.mockImplementation(() => Promise.resolve(mockCSV));

  const facilities = await findNearestFacilities({
    district: 'Cuttack',
    limit: 2
  });

  assertEquals(facilities.length, 1); // Only Cuttack District Hospital matches
  assertEquals(facilities[0].name, 'Cuttack District Hospital');
  assertEquals(facilities[0].type, 'District Hospital');
  assertEquals(facilities[0].address, 'Cuttack, Odisha 753001');
  assertEquals(facilities[0].phone, '0671-2301234');
  assertEquals(facilities[0].lat, 20.4625);
  assertEquals(facilities[0].lon, 85.8830);

  mockReadTextFile.restore();
});

Deno.test("findNearestFacilities - handles CSV loading failure", async () => {
  // Mock CSV loading failure
  mockReadTextFile.mockImplementation(() => 
    Promise.reject(new Error('File not found'))
  );

  const facilities = await findNearestFacilities({
    district: 'Cuttack',
    limit: 3
  });

  // Should return curated fallback data
  assertEquals(facilities.length, 3);
  assertExists(facilities[0].name);
  assertExists(facilities[0].type);
  assertExists(facilities[0].address);

  mockReadTextFile.restore();
});

Deno.test("findNearestFacilities - filters by district", async () => {
  const mockCSV = `name,type,address,phone,district,pincode,lat,lon
"Cuttack District Hospital","District Hospital","Cuttack, Odisha 753001","0671-2301234","Cuttack","753001","20.4625","85.8830"
"Bhubaneswar Capital Hospital","Medical College","Bhubaneswar, Odisha 751019","0674-2305678","Bhubaneswar","751019","20.2961","85.8245"`;

  mockReadTextFile.mockImplementation(() => Promise.resolve(mockCSV));

  const facilities = await findNearestFacilities({
    district: 'Bhubaneswar',
    limit: 5
  });

  assertEquals(facilities.length, 1);
  assertEquals(facilities[0].name, 'Bhubaneswar Capital Hospital');

  mockReadTextFile.restore();
});

Deno.test("findNearestFacilities - filters by pincode", async () => {
  const mockCSV = `name,type,address,phone,district,pincode,lat,lon
"Cuttack District Hospital","District Hospital","Cuttack, Odisha 753001","0671-2301234","Cuttack","753001","20.4625","85.8830"
"Cuttack PHC","Primary Health Centre","Cuttack, Odisha 753002","0671-2301235","Cuttack","753002","20.4626","85.8831"`;

  mockReadTextFile.mockImplementation(() => Promise.resolve(mockCSV));

  const facilities = await findNearestFacilities({
    district: 'Cuttack',
    pincode: '753002',
    limit: 5
  });

  assertEquals(facilities.length, 1);
  assertEquals(facilities[0].name, 'Cuttack PHC');

  mockReadTextFile.restore();
});

Deno.test("findNearestFacilities - calculates distances with coordinates", async () => {
  const mockCSV = `name,type,address,phone,district,pincode,lat,lon
"Cuttack District Hospital","District Hospital","Cuttack, Odisha 753001","0671-2301234","Cuttack","753001","20.4625","85.8830"
"Bhubaneswar Capital Hospital","Medical College","Bhubaneswar, Odisha 751019","0674-2305678","Bhubaneswar","751019","20.2961","85.8245"`;

  mockReadTextFile.mockImplementation(() => Promise.resolve(mockCSV));

  const facilities = await findNearestFacilities({
    district: 'Cuttack',
    lat: 20.4625,
    lon: 85.8830,
    limit: 2
  });

  assertEquals(facilities.length, 1);
  assertEquals(facilities[0].distance_km, 0); // Same coordinates

  mockReadTextFile.restore();
});

Deno.test("findNearestFacilities - handles unknown district", async () => {
  const mockCSV = `name,type,address,phone,district,pincode,lat,lon
"Cuttack District Hospital","District Hospital","Cuttack, Odisha 753001","0671-2301234","Cuttack","753001","20.4625","85.8830"`;

  mockReadTextFile.mockImplementation(() => Promise.resolve(mockCSV));

  const facilities = await findNearestFacilities({
    district: 'UnknownDistrict',
    limit: 3
  });

  // Should return top facilities when no district match
  assertEquals(facilities.length, 1);
  assertEquals(facilities[0].name, 'Cuttack District Hospital');

  mockReadTextFile.restore();
});

Deno.test("getFacilitiesByType - filters by facility type", async () => {
  const mockCSV = `name,type,address,phone,district,pincode,lat,lon
"Cuttack District Hospital","District Hospital","Cuttack, Odisha 753001","0671-2301234","Cuttack","753001","20.4625","85.8830"
"Bhubaneswar Medical College","Medical College","Bhubaneswar, Odisha 751019","0674-2305678","Bhubaneswar","751019","20.2961","85.8245"
"Cuttack PHC","Primary Health Centre","Cuttack, Odisha 753002","0671-2301235","Cuttack","753002","20.4626","85.8831"`;

  mockReadTextFile.mockImplementation(() => Promise.resolve(mockCSV));

  const hospitals = await getFacilitiesByType('District Hospital');
  const colleges = await getFacilitiesByType('Medical College');
  const phcs = await getFacilitiesByType('Primary Health Centre');

  assertEquals(hospitals.length, 1);
  assertEquals(hospitals[0].name, 'Cuttack District Hospital');

  assertEquals(colleges.length, 1);
  assertEquals(colleges[0].name, 'Bhubaneswar Medical College');

  assertEquals(phcs.length, 1);
  assertEquals(phcs[0].name, 'Cuttack PHC');

  mockReadTextFile.restore();
});

Deno.test("searchFacilities - searches by name and address", async () => {
  const mockCSV = `name,type,address,phone,district,pincode,lat,lon
"Cuttack District Hospital","District Hospital","Cuttack, Odisha 753001","0671-2301234","Cuttack","753001","20.4625","85.8830"
"Bhubaneswar Capital Hospital","Medical College","Bhubaneswar, Odisha 751019","0674-2305678","Bhubaneswar","751019","20.2961","85.8245"`;

  mockReadTextFile.mockImplementation(() => Promise.resolve(mockCSV));

  const searchResults = await searchFacilities('Cuttack');
  const addressSearch = await searchFacilities('Bhubaneswar');

  assertEquals(searchResults.length, 1);
  assertEquals(searchResults[0].name, 'Cuttack District Hospital');

  assertEquals(addressSearch.length, 1);
  assertEquals(addressSearch[0].name, 'Bhubaneswar Capital Hospital');

  mockReadTextFile.restore();
});

Deno.test("findNearestFacilities - respects limit parameter", async () => {
  const mockCSV = `name,type,address,phone,district,pincode,lat,lon
"Cuttack District Hospital","District Hospital","Cuttack, Odisha 753001","0671-2301234","Cuttack","753001","20.4625","85.8830"
"Bhubaneswar Capital Hospital","Medical College","Bhubaneswar, Odisha 751019","0674-2305678","Bhubaneswar","751019","20.2961","85.8245"
"Puri District Hospital","District Hospital","Puri, Odisha 752001","06752-223456","Puri","752001","19.8138","85.8315"`;

  mockReadTextFile.mockImplementation(() => Promise.resolve(mockCSV));

  const facilities = await findNearestFacilities({
    district: 'Cuttack',
    limit: 1
  });

  assertEquals(facilities.length, 1);

  const moreFacilities = await findNearestFacilities({
    district: 'Cuttack',
    limit: 5
  });

  assertEquals(moreFacilities.length, 1); // Only one Cuttack facility in mock data

  mockReadTextFile.restore();
});

Deno.test("findNearestFacilities - handles malformed CSV gracefully", async () => {
  const malformedCSV = `name,type,address,phone,district,pincode,lat,lon
"Cuttack District Hospital","District Hospital","Cuttack, Odisha 753001","0671-2301234","Cuttack","753001","20.4625","85.8830"
"Invalid Row"
"Bhubaneswar Capital Hospital","Medical College","Bhubaneswar, Odisha 751019","0674-2305678","Bhubaneswar","751019","20.2961","85.8245"`;

  mockReadTextFile.mockImplementation(() => Promise.resolve(malformedCSV));

  const facilities = await findNearestFacilities({
    district: 'Cuttack',
    limit: 5
  });

  assertEquals(facilities.length, 1);
  assertEquals(facilities[0].name, 'Cuttack District Hospital');

  mockReadTextFile.restore();
});

