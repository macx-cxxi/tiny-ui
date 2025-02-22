#!/usr/bin/env node

import inquirer from "inquirer";
import fse from 'fs-extra';
// import { resolve }  from 'path';
import handlebars from "handlebars";
import {insetComponentInstallTemplete, creatDemoTemplete, creatMdTemplete, creatTemplete, creatPluginTemplete} from './libs/temp';
import {readFilesTemplet, writeFilesTemplete, outputFileTo, mkdirVali} from './libs/node';

/**
 * 读取 packages/ui/src/pluginList.json 并更新
 */
const writePluginListJson = async(meta)=>{
    let filePath = './src/pluginList.json';
    let pluginList:any = await readFilesTemplet(filePath);
    const pluginListContent = JSON.parse(pluginList);
    pluginListContent.push(meta);
    const newListFileContentFile = JSON.stringify(pluginListContent, null, 2);
    const updateTemplete = await writeFilesTemplete(filePath, newListFileContentFile );
    if(updateTemplete){
        return pluginListContent;
    }
};
/**
 * 组件注册
 * @param {*} name 
 */
const initComponent =async (name, list)=>{
    const templete = insetComponentInstallTemplete(name);
    const templeteMate = {
        importPlugins: list
            .filter((i) => {
                return !i.isNotPlugin;
            })
            .map(
                ({ componentName }) => `import { ${componentName}Plugin } from './${componentName}';`
            )
            .join("\n"),
    
        installPlugins:list
            .filter((i) => {
                return !i.isNotPlugin;
            })
            .map(({ componentName }) => `${componentName}Plugin.install?.(app);`)
            .join("\n    "),
        exportPlugins:list
            .filter((i) => {
                return !i.isNotPlugin;
            })
            .map(({ componentName }) => `export * from './${componentName}'`)
            .join("\n"),

    };
    const installFileContent = handlebars.compile(templete, {
        noEscape: true,
    })(templeteMate);
    let outputinfo = await outputFileTo('./src/index.ts', installFileContent);
    if(outputinfo){
        console.log(`组件自动注册注册成功`);
    }
};
/**
 * 创建组件对应文件模版
 * @param {*} name
 */
const creatComponentsFiles = async (info) => {
    const { componentName } = info;
    let dirPath = `./src/${componentName}`;
    let mainPath = await mkdirVali(`${dirPath}`);
    if (mainPath) {
        let childrenPath = await Promise.all([
            mkdirVali(`${dirPath}/src`),
            mkdirVali(`${dirPath}/doc`),
        ]);
        if (!childrenPath.includes(false)) {
            let wirteComplete = await Promise.all([
                writeFilesTemplete(`${dirPath}/src/${componentName}.vue`, creatTemplete(componentName)),
                writeFilesTemplete(`${dirPath}/index.ts`, creatPluginTemplete(componentName)),
                writeFilesTemplete(`${dirPath}/doc/demo.vue`,creatDemoTemplete(componentName)),
                outputFileTo(`${dirPath}/doc/README.md`,creatMdTemplete(componentName)),
            ]);
            if (!wirteComplete.includes(false)) {
                //初始化组件
              
                console.log(`组件创建完成，请在 src/${componentName} 目录进行组件开发`);
            }
        }
    }
};
/**
 * 命令交互校验
 * TODO  待补 组件重名校验。。。。。
 */
const creatComponents = async () => {
    const info = await inquirer.prompt([
        {
            type: "input",
            message: "请输入要创建的组件名称：",
            name: "componentName",
            validate(answer) {
                const done = this.async();
                const validateRes = /^[A-Z]/.test(answer);
                if (!validateRes) {
                    done("请输入正确的组件名！");
                    return;
                }
                
                done(null, true);
            },
        },
        {
            type: "input",
            message: "请输入组件的功能描述：",
            name: "componentDesc",
            default: "默认：这是一个新组件",
        },
    ]);
  
    info.type='组件';
    info.isNotPlugin = false;
    info.compZhName = '基础组件';
    return info;
};

// 创建组件脚本主入口
const run = async ()=>{
    let info =await creatComponents();
    const  {componentName} = info;
    creatComponentsFiles(info);
    // 更新组件list文件
    const pluginlist = await writePluginListJson(info);
    initComponent(componentName, pluginlist);
};
run();

