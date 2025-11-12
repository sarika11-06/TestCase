"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Button,
	Badge,
} from "@/components/ui";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { generateForFrontend } from "../../../generator";

// Helper functions to parse steps
const extractElementName = (step: string) => {
	const match = step.match(/'(.*?)'/);
	return match ? match[1] : "ELEMENT";
};

const extractData = (step: string) => {
	const match = step.match(/"(.*?)"/);
	return match ? match[1] : "";
};

const TestCaseGenerator = () => {
	const { toast } = useToast();
	const [inputText, setInputText] = useState("");
	const [generatedData, setGeneratedData] = useState<any>(null);
	const [testCaseOutputs, setTestCaseOutputs] = useState<any>({});
	const [expandedTestCase, setExpandedTestCase] = useState<string | null>(null);

	// Generate test cases
	const generateMutation = useMutation({
		mutationFn: async () => {
			// Replace with your actual API call
			return new Promise<any>((resolve) => {
				setTimeout(() => {
					resolve({
						summary: { totalTests: 2 },
						testCases: [
							{
								id: "1",
								title: "Login Test",
								type: "Functional",
								steps: [
									"Fill 'username' with \"admin\"",
									"Fill 'password' with \"password\"",
									"Click 'loginButton'",
								],
							},
							{
								id: "2",
								title: "Logout Test",
								type: "Functional",
								steps: ["Click 'profileMenu'", "Click 'logoutButton'"],
							},
						],
					});
				}, 1000);
			});
		},
		onSuccess: (data) => {
			setGeneratedData(data);

			const outputs: any = {};

			data.testCases.forEach((tc: any) => {
				const testCase = {
					id: tc.id,
					name: tc.title,
					desc: tc.type,
					steps: tc.steps.map((step: string, idx: number) => ({
						id: `${idx + 1}`,
						Page: "LoginPage",
						Action:
							step.toLowerCase().includes("fill") ||
							step.toLowerCase().includes("enter")
								? "EnterText"
								: step.toLowerCase().includes("click")
								? "Click"
								: "Action",
						Element: extractElementName(step),
						Data: extractData(step) || "",
						Expected: step,
					})),
				};

				const { playwrightTs, xml } = generateForFrontend(testCase);

				const downloadXML = () => {
					const blob = new Blob([xml], { type: "application/xml" });
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `${testCase.name.replace(/\s+/g, "_")}.xml`;
					a.click();
					URL.revokeObjectURL(url);
				};

				const downloadPlaywright = () => {
					const blob = new Blob([playwrightTs], { type: "text/plain" });
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `${testCase.name.replace(/\s+/g, "_")}.ts`;
					a.click();
					URL.revokeObjectURL(url);
				};

				outputs[tc.id] = {
					xmlCode: xml,
					playwrightCode: playwrightTs,
					downloadXML,
					downloadPlaywright,
				};
			});

			setTestCaseOutputs(outputs);

			toast({
				title: "✅ Test cases generated!",
				description: `Generated ${data.summary.totalTests} tests`,
			});
		},
	});

	return (
		<div className="min-h-screen bg-background p-4">
			<div className="max-w-[98vw] mx-auto">
				<div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-4">
					<div className="space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
						<textarea
							value={inputText}
							onChange={(e) => setInputText(e.target.value)}
							placeholder="Enter test case description..."
							className="w-full h-32 p-2 border rounded"
						/>
						<button
							onClick={() => generateMutation.mutate()}
							className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
						>
							Generate Test Cases
						</button>

						{generatedData && (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-lg">
										Generated Test Cases (
										{generatedData.summary.totalTests})
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										{generatedData.testCases.map((tc) => (
											<Card key={tc.id}>
												<CardHeader className="pb-2 pt-3">
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<div className="font-medium text-xs">
																{tc.title}
															</div>
															<div className="flex gap-1.5 mt-1">
																<Badge
																	variant="outline"
																	className="text-[9px] h-4 px-1.5"
																>
																	{tc.type}
																</Badge>
																<Badge
																	variant="outline"
																	className="text-[9px] h-4 px-1.5"
																>
																	{tc.priority}
																</Badge>
															</div>
														</div>
														<Button
															size="icon"
															variant="ghost"
															onClick={() =>
																setExpandedTestCase(
																	expandedTestCase ===
																		tc.id
																		? null
																		: tc.id
																)
															}
															className="h-6 w-6"
														>
															{expandedTestCase === tc.id ? (
																<ChevronUp className="w-3 h-3" />
															) : (
																<ChevronDown className="w-3 h-3" />
															)}
														</Button>
													</div>
												</CardHeader>

												{expandedTestCase === tc.id && (
													<CardContent className="pt-0 pb-3">
														<div className="space-y-1.5 text-[10px] mb-2">
															<div>
																<strong>Steps:</strong>
															</div>
															<ol className="list-decimal list-inside space-y-0.5">
																{tc.steps.map((s, i) => (
																	<li key={i}>{s}</li>
																))}
															</ol>
														</div>

														<div className="flex items-center justify-between mb-1">
															<div className="text-[9px] font-semibold">
																Playwright Code:
															</div>
															{testCaseOutputs[tc.id] && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={testCaseOutputs[tc.id].downloadPlaywright}
																	className="h-6 text-[9px] px-2"
																>
																	<Download className="w-3 h-3 mr-1" />
																	.ts
																</Button>
															)}
														</div>
														<pre className="bg-[#1f2937] text-[#e5e7eb] p-2 rounded text-[9px] overflow-auto max-h-32 mb-3">
															<code>{testCaseOutputs[tc.id]?.playwrightCode}</code>
														</pre>

														<div className="flex items-center justify-between mb-1">
															<div className="text-[9px] font-semibold">
																XML Format:
															</div>
															{testCaseOutputs[tc.id] && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={testCaseOutputs[tc.id].downloadXML}
																	className="h-6 text-[9px] px-2"
																>
																	<Download className="w-3 h-3 mr-1" />
																	.xml
																</Button>
															)}
														</div>
														<pre className="bg-[#1f2937] text-[#e5e7eb] p-2 rounded text-[9px] overflow-auto max-h-32">
															<code>{testCaseOutputs[tc.id]?.xmlCode}</code>
														</pre>
													</CardContent>
												)}
											</Card>
										))}
									</div>
								</CardContent>
							</Card>
						)}
					</div>
					<div className="hidden lg:block">
						<div className="h-full bg-[#f9fafb] p-4 rounded-lg border">
							<div className="text-sm text-muted-foreground mb-4">
								Instructions
							</div>
							<ol className="list-decimal list-inside space-y-2">
								<li className="text-sm">
									Describe your test cases in the left panel using a simple
									English-like syntax.
								</li>
								<li className="text-sm">
									Click on "Generate Test Cases" to create automated test cases.
								</li>
								<li className="text-sm">
									Download the generated test cases in your preferred format
									(Playwright or XML).
								</li>
							</ol>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TestCaseGenerator;
