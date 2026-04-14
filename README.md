# 谁是卧底 · 发牌助手（Flask）

## Overview
- **Purpose**: 谁是卧底游戏发牌助手
- **Tech Stack**: React, Flask
- **Key Features**: 设置总人数、卧底人数、是否启用白板与白板人数；为每位玩家设置名字与颜色；开始游戏；长按玩家卡片名字查看“自己的词”；点击玩家卡片进行投票出局；实时判定胜负
- **Live Demo**: http://127.0.0.1:5000/

## Quick Start
1. Prerequisites
   - 安装依赖（建议使用虚拟环境）
   ```bash
pip install -r requirements.txt
```
2. Installation
   - 运行服务
   ```bash
python app.py
```
3. Running the app
   - 打开浏览器访问
   ```
http://127.0.0.1:5000/
```

## Project Structure
```bash
project-root/
app.py
data/
words.json
...
```

## API Documentation
[暂无]

## Contributing
[暂无]

## License
[暂无]

## 功能概述

- 设置总人数、卧底人数、是否启用白板与白板人数。
- 为每位玩家设置名字与颜色。
- 开始游戏：系统从 `data/words.json` 随机选择一组近义词，随机分配卧底/白板/平民。
- 长按玩家卡片名字查看“自己的词”（白板为空）。
- 点击玩家卡片进行投票出局（带确认）。
- 实时判定胜负：
  - 卧底存活数为 0 → 平民阵营胜利（含白板）。
  - 卧底存活数 ≥ 好人（平民+白板）存活数 → 卧底阵营胜利。

## 自定义词库

编辑 `data/words.json`，每条为：

```json
{ "civilian": "苹果", "undercover": "香蕉" }
```

## 注意

- 当前为单房间、内存态示例，适合本地/小规模使用。生产可扩展为多房间并持久化存储。
