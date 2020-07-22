import * as vscode from 'vscode'
import {Config} from './configration'
export class runcode{
    private readonly _masmChannel: vscode.OutputChannel;
    private _terminal: vscode.Terminal|null
    private _config:Config|null
    private extpath:string
    constructor(content: vscode.ExtensionContext) {
        const path = content.globalStoragePath.replace(/\\/g, '/');
        this.extpath = content.extensionPath
        this._masmChannel = vscode.window.createOutputChannel('Masm-Tasm');
        this._terminal = null;
        this._config=null;
    }
    deactivate() {
        this._masmChannel.dispose();
        if (this._terminal !== null) {
            this._terminal.dispose();
        }
    }
    /**删除原来的旧文件，复制编辑器中的新文件
     * 更新设置，根据设置保存编辑器文件
     * 根据设置指定不同的汇编指令
     **/
    private update(){
        this._config=new Config(this.extpath)
        if (this._config.savefirst) {
            vscode.workspace.saveAll()
        }
        return this._config
    }
    private crtTerminal(hide:boolean,cwdpath:string,delcp?:boolean,more?:string):vscode.Terminal {
        this._config=this.update()
        if (this._terminal === null ) {
            this._terminal = vscode.window.createTerminal({
                cwd: cwdpath,
                shellPath: "cmd.exe",
                hideFromUser: hide,
            });
        }
        // vscode.window.onDidCloseTerminal(t => {
        //     if (t.exitStatus && t.exitStatus.code) {
        //         vscode.window.showInformationMessage(`Exit code: ${t.exitStatus.code}`);
        //     }
        //   });
        return this._terminal
    }
    openDOSBox(more:string,bothtools:boolean,conf?:Config) {
        if(!conf){conf=this.update()}
        this._terminal=this.crtTerminal(true,conf.path);
            const filename = vscode.window.activeTextEditor?.document.fileName;
            this._terminal.sendText('del work\\T.* && copy "'+filename+'" work\\T.ASM');
            this._masmChannel.appendLine('清除原来的文件T.*并将当前编辑文件复制到'+'work/T.ASM');
        conf.writeConfig(more,bothtools);
        let command ='start/min/wait "" "dosbox/dosbox.exe" -conf "dosbox/VSC-ExtUse.conf" ';
        this._masmChannel.appendLine(command);
        this._terminal.sendText(command);
        this._masmChannel.appendLine('已打开dosbox，并配置相关环境');
        if(more){this._terminal.sendText(more)}
    }
    private PlayerASM(mode:string,conf:Config)
    {
        const filename = vscode.window.activeTextEditor?.document.fileName;
        let command=this.extpath+'\\tools\\asmo.bat "'+conf.path+'" '+conf.MASMorTASM+' '+mode+' "'+filename+'"'
        this._terminal=this.crtTerminal(false,conf.path,false);
        this._terminal.show()
        this._terminal.sendText(command)
    }
    Run(){
        this._config=this.update()
        switch(this._config.DOSemu){
            case 'msdos player': this.PlayerASM('run',this._config);break;
            case 'dosbox':
                let text=`${this._config.ASM} \nif exist T.obj ${this._config.LINK} \nif exist T.exe T.exe \n`+this._config.BOXrun
                this.openDOSBox(text,false)
                break;
            case 'mixed':
                break;
            default: throw new Error("未指定emulator");  
        }
    }
    Debug(){
        this._config=this.update()
        if (this._config.DOSemu=='msdos player' && this._config.MASMorTASM=='MASM'){
            this.PlayerASM('debug',this._config)
        }
        else{
            let text=`${this._config.ASM} \nif exist T.obj ${this._config.LINK} \nif exist T.exe `+this._config.DEBUG
            this.openDOSBox(text,false)
        }
    }
}