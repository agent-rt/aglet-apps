<Page onEnter={() => scripts.refreshNow()}>
  {/* Jira 只读看板:Atlassian REST API + API token 直连(零 CLI)。凭据在「设置」tab 填,
      token 存 secrets(Keychain)。按 status.statusCategory 三桶分 tab。点卡片跳浏览器。 */}
  {/* 未配置引导由宿主通用横幅提供(框架检测 required 设置未填),app 不再手搓。 */}
  {/* ⚠️ Page 的直接子级**只放 Tabs**(照 hn):曾在这上面加过一个 sync 集合的错误横幅,
      多出的兄弟节点会让 Tabs 内列表的版式跑掉。同步失败的可见性走 jobs.js 的
      console.warn(进 logs/jira.jsonl)+ `sync` 集合落库,不占 UI。 */}
  {/* 卡片版式对齐 hn:标题走 <Heading level={3}>、元信息合成一行、时间用 |relative
      管道、**不用 tailwind className**,间距/对齐全走组件 props。 */}
  <Tabs id="main" defaultValue="doing" position="bottom">

    <Tab value="doing" label={t.tabDoing} icon="arrow-right">
      <DataList
        collection="issues"
        query={{
          where: { bucket: "doing" },
          orderBy: [{ field: "updated", direction: "desc" }],
        }}
        paginate={{ pageSize: 10, infinite: true }}
      >
        <Empty><EmptyState title={t.emptyDoingTitle} description={t.emptyDoingDesc} icon="coffee"/></Empty>
        <Item>
          <Card>
            <VStack gap={4}>
              <HStack justify="between" gap={6}>
                <Heading level={3}>{item.summary}</Heading>
                <Tag label={item.status} color="primary" size="sm"/>
              </HStack>
              <HStack gap={5} align="center">
                <Text muted>{item.key}</Text>
                <Tooltip content={item.updated}>
                  <HStack gap={1} align="center">
                    <Icon symbol="clock" size="sm" color="secondary"/>
                    <Text muted>{item.updated | relative}</Text>
                  </HStack>
                </Tooltip>
                {/* 截止日三档紧急度(flag 由 jobs.js 算,颜色在这里定 —— 改配色不必重跑
                    ingest):overdue 红+warning 图标 / soon(≤3天) 橙 / later 灰。三个都是
                    **正向**守卫:否定式(!overdue && !soon)会编出无 when 的 If → web 显 native 隐。
                    正文给相对时间("in 4 days")读着快,**真正的日期**放 <Tooltip> —— native
                    渲成 .help() 原生 hover 提示,不占列表宽度。 */}
                <Show when={item.due_overdue}>
                  <Tooltip content={item.due}>
                    <HStack gap={1} align="center">
                      <Icon symbol="warning" size="sm" color="danger"/>
                      <Text color="danger">{t.due} {item.due | relative}</Text>
                    </HStack>
                  </Tooltip>
                </Show>
                <Show when={item.due_soon}>
                  <Tooltip content={item.due}>
                    <HStack gap={1} align="center">
                      <Icon symbol="calendar" size="sm" color="warning"/>
                      <Text color="warning">{t.due} {item.due | relative}</Text>
                    </HStack>
                  </Tooltip>
                </Show>
                <Show when={item.due_later}>
                  <Tooltip content={item.due}>
                    <HStack gap={1} align="center">
                      <Icon symbol="calendar" size="sm" color="secondary"/>
                      <Text muted>{t.due} {item.due | relative}</Text>
                    </HStack>
                  </Tooltip>
                </Show>
              </HStack>
              <HStack justify="end" gap={6} align="center">
                <Tooltip content={item.url}>
                  <Link label={t.openJira} icon="arrow-square-out" href={item.url}/>
                </Tooltip>
              </HStack>
            </VStack>
          </Card>
        </Item>
      </DataList>
    </Tab>

    <Tab value="todo" label={t.tabTodo} icon="tray">
      <DataList
        collection="issues"
        query={{
          where: { bucket: "todo" },
          orderBy: [{ field: "updated", direction: "desc" }],
        }}
        paginate={{ pageSize: 10, infinite: true }}
      >
        <Empty><EmptyState title={t.emptyTodoTitle} description={t.emptyTodoDesc} icon="tray"/></Empty>
        <Item>
          <Card>
            <VStack gap={4}>
              <HStack justify="between" gap={6}>
                <Heading level={3}>{item.summary}</Heading>
                <Tag label={item.status} color="warning" size="sm"/>
              </HStack>
              <HStack gap={5} align="center">
                <Text muted>{item.key}</Text>
                <Tooltip content={item.updated}>
                  <HStack gap={1} align="center">
                    <Icon symbol="clock" size="sm" color="secondary"/>
                    <Text muted>{item.updated | relative}</Text>
                  </HStack>
                </Tooltip>
                <Show when={item.due_overdue}>
                  <Tooltip content={item.due}>
                    <HStack gap={1} align="center">
                      <Icon symbol="warning" size="sm" color="danger"/>
                      <Text color="danger">{t.due} {item.due | relative}</Text>
                    </HStack>
                  </Tooltip>
                </Show>
                <Show when={item.due_soon}>
                  <Tooltip content={item.due}>
                    <HStack gap={1} align="center">
                      <Icon symbol="calendar" size="sm" color="warning"/>
                      <Text color="warning">{t.due} {item.due | relative}</Text>
                    </HStack>
                  </Tooltip>
                </Show>
                <Show when={item.due_later}>
                  <Tooltip content={item.due}>
                    <HStack gap={1} align="center">
                      <Icon symbol="calendar" size="sm" color="secondary"/>
                      <Text muted>{t.due} {item.due | relative}</Text>
                    </HStack>
                  </Tooltip>
                </Show>
              </HStack>
              <HStack justify="end" gap={6} align="center">
                <Tooltip content={item.url}>
                  <Link label={t.openJira} icon="arrow-square-out" href={item.url}/>
                </Tooltip>
              </HStack>
            </VStack>
          </Card>
        </Item>
      </DataList>
    </Tab>

    <Tab value="done" label={t.tabDone} icon="check-circle">
      <DataList
        collection="issues"
        query={{
          where: { bucket: "done" },
          orderBy: [{ field: "updated", direction: "desc" }],
        }}
        paginate={{ pageSize: 10, infinite: true }}
      >
        <Empty><EmptyState title={t.emptyDoneTitle} description={t.emptyDoneDesc} icon="check-circle"/></Empty>
        <Item>
          <Card>
            <VStack gap={4}>
              <HStack justify="between" gap={6}>
                <Heading level={3}>{item.summary}</Heading>
                <Tag label={item.status} color="success" size="sm"/>
              </HStack>
              <HStack gap={5} align="center">
                <Text muted>{item.key}</Text>
                <Tooltip content={item.updated}>
                  <HStack gap={1} align="center">
                    <Icon symbol="clock" size="sm" color="secondary"/>
                    <Text muted>{item.updated | relative}</Text>
                  </HStack>
                </Tooltip>
                {/* done 桶不标逾期(jobs.js 里 bucket==="done" 一律 due_overdue=false)。 */}
                <Show when={item.due_soon}>
                  <Tooltip content={item.due}>
                    <HStack gap={1} align="center">
                      <Icon symbol="calendar" size="sm" color="warning"/>
                      <Text color="warning">{t.due} {item.due | relative}</Text>
                    </HStack>
                  </Tooltip>
                </Show>
                <Show when={item.due_later}>
                  <Tooltip content={item.due}>
                    <HStack gap={1} align="center">
                      <Icon symbol="calendar" size="sm" color="secondary"/>
                      <Text muted>{t.due} {item.due | relative}</Text>
                    </HStack>
                  </Tooltip>
                </Show>
              </HStack>
              <HStack justify="end" gap={6} align="center">
                <Tooltip content={item.url}>
                  <Link label={t.openJira} icon="arrow-square-out" href={item.url}/>
                </Tooltip>
              </HStack>
            </VStack>
          </Card>
        </Item>
      </DataList>
    </Tab>

  </Tabs>
</Page>
