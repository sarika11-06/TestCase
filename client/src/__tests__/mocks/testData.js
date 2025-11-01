export const mockTestGenerationResponse = {
    analysis: {
        url: 'https://example.com',
        title: 'Example Website',
        description: 'Test website',
        pages: ['/home', '/about'],
        forms: [{
                name: 'login',
                fields: ['username', 'password']
            }],
        buttons: ['Submit', 'Login'],
        links: ['/home', '/about']
    },
    testCases: [{
            id: '1',
            title: 'Test Login Form Validation',
            description: 'Verify login form validation',
            type: 'UI',
            priority: 'High',
            steps: [
                'Navigate to login page',
                'Submit empty form',
                'Verify validation messages'
            ],
            expectedResult: 'Form shows validation errors',
            playwrightCode: 'test("login validation", async () => { /* test code */ });'
        }],
    summary: {
        totalTests: 1,
        byType: { UI: 1 },
        coverageAreas: ['Forms', 'Validation']
    }
};
