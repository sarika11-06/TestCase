export interface Step {
	id: string;
	Page: string;
	Action: string;
	Element?: string;
	Data?: string;
	Expected?: string;
}

export interface TestCase {
	id: string;
	name: string;
	desc?: string;
	steps: Step[];
}

// Example test case (replace this with data coming from your UI)
export const exampleTestCase: TestCase = {
	id: "TC001",
	name: "Valid Login",
	desc: "Verify user can log in with valid credentials",
	steps: [
		{ id: "1", Page: "LoginPage", Action: "EnterText", Element: "UsernameField", Data: "validUser", Expected: "Username is entered successfully" },
		{ id: "2", Page: "LoginPage", Action: "EnterText", Element: "PasswordField", Data: "validPassword", Expected: "Password is entered successfully" },
		{ id: "3", Page: "LoginPage", Action: "Click", Element: "LoginButton", Expected: "User navigated to Dashboard page" },
		{ id: "4", Page: "DashboardPage", Action: "VerifyText", Element: "WelcomeMessage", Expected: "Welcome, validUser" },
	],
};

// Return a deep-cloned example so the frontend can modify safely
export function getClonedExampleTestCase(): TestCase {
	return JSON.parse(JSON.stringify(exampleTestCase));
}
