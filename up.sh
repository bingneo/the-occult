#!/bin/bash
# 使用指定的 Compose 文件和环境文件启动服务（后台运行）

docker compose -f docker-compose.aliyun.yml --env-file .env.aliyun up -d
