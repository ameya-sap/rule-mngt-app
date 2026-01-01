import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { getRulesByCategory, getAllCategories, getRule } from "./db.js";
import { evaluateRule } from "./logic.js";
// Factory function to create a new MCP Server instance
const getServer = () => {
    const server = new McpServer({
        name: "Rules MCP Server",
        version: "1.0.0"
    }, {
        capabilities: {
            logging: {}
        }
    });
    // Register Tools
    server.tool("list_rules_by_category", "List available rules for a specific business category", {
        category: z.string().describe("The business category to filter rules by (e.g., 'Procurement', 'Finance')")
    }, async ({ category }) => {
        const rules = await getRulesByCategory(category);
        if (rules.length === 0) {
            return {
                content: [{
                        type: "text",
                        text: `No rules found for category: ${category}`
                    }]
            };
        }
        const summary = rules.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description
        }));
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(summary, null, 2)
                }]
        };
    });
    server.tool("evaluate_rule_logic", "Evaluate a specific rule against provided data. Use this to deterministically check if conditions are met.", {
        ruleId: z.string().describe("The ID of the rule to evaluate"),
        data: z.record(z.string(), z.any()).describe("Key-value pairs of data to evaluate against the rule's conditions")
    }, async ({ ruleId, data }) => {
        const rule = await getRule(ruleId);
        if (!rule) {
            return {
                isError: true,
                content: [{ type: "text", text: `Rule not found with ID: ${ruleId}` }]
            };
        }
        const { matched, log } = await evaluateRule(data, rule);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        matched,
                        ruleName: rule.name,
                        evaluationLog: log
                    }, null, 2)
                }]
        };
    });
    server.tool("get_rule_requirements", "Get the list of required fields for a specific rule to guide data extraction.", {
        ruleId: z.string().describe("The ID of the rule")
    }, async ({ ruleId }) => {
        const rule = await getRule(ruleId);
        if (!rule) {
            return {
                isError: true,
                content: [{ type: "text", text: `Rule not found with ID: ${ruleId}` }]
            };
        }
        const requiredFields = new Set();
        rule.conditions.forEach((c) => {
            requiredFields.add(c.field);
            if (typeof c.value === 'object' && c.value !== null && !Array.isArray(c.value)) {
                const formula = c.value;
                if (formula.field) {
                    requiredFields.add(formula.field);
                }
            }
        });
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        ruleName: rule.name,
                        requiredFields: Array.from(requiredFields)
                    }, null, 2)
                }]
        };
    });
    server.tool("get_all_categories", "Get a list of all available business categories to help discover rules.", {}, async () => {
        const categories = await getAllCategories();
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(categories, null, 2)
                }]
        };
    });
    return server;
};
const app = createMcpExpressApp({ host: '0.0.0.0' });
app.use((req, res, next) => {
    console.log(`[DEBUG] Incoming Request: ${req.method} ${req.url}`);
    next();
});
app.post("/mcp", async (req, res) => {
    const server = getServer();
    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on('close', () => {
            transport.close();
            server.close();
        });
    }
    catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: "2.0",
                error: {
                    code: -32603,
                    message: "Internal server error"
                },
                id: null
            });
        }
    }
});
app.get("/mcp", async (req, res) => {
    // Return 405 as per stateless example
    res.status(405).json({
        jsonrpc: "2.0",
        error: {
            code: -32601,
            message: "Method not allowed. Use POST."
        },
        id: null
    });
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Rules MCP Server listening on port ${PORT}`);
});
