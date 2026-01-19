"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const InterviewPanel_1 = require("./panels/InterviewPanel");
const ProgressProvider_1 = require("./providers/ProgressProvider");
const MailProvider_1 = require("./providers/MailProvider");
function activate(context) {
    console.log('GDD Assistant is now active');
    // 注册命令
    const startCommand = vscode.commands.registerCommand('gdd.start', () => {
        InterviewPanel_1.InterviewPanel.render(context.extensionUri);
    });
    const sendMailCommand = vscode.commands.registerCommand('gdd.sendMail', async () => {
        const mailType = await vscode.window.showQuickPick(['command', 'opinion', 'comment'], { placeHolder: '选择邮件类型' });
        if (!mailType)
            return;
        const priority = await vscode.window.showQuickPick(['urgent', 'normal', 'low'], { placeHolder: '选择优先级' });
        if (!priority)
            return;
        const content = await vscode.window.showInputBox({
            prompt: '输入邮件内容',
            placeHolder: '邮件内容...'
        });
        if (!content)
            return;
        vscode.window.showInformationMessage(`邮件已发送: [${priority}] ${content}`);
    });
    const previewCommand = vscode.commands.registerCommand('gdd.preview', () => {
        vscode.commands.executeCommand('markdown.showPreview');
    });
    // 注册侧边栏视图
    const progressProvider = new ProgressProvider_1.ProgressProvider();
    vscode.window.registerTreeDataProvider('gdd-progress', progressProvider);
    const mailProvider = new MailProvider_1.MailProvider();
    vscode.window.registerTreeDataProvider('gdd-mails', mailProvider);
    context.subscriptions.push(startCommand, sendMailCommand, previewCommand);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map