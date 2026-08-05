<Page onEnter={() => scripts.refreshNow()}>
  {/* Jira 只读看板:Atlassian REST API + API token 直连(零 CLI)。凭据在「设置」tab 填,
      token 存 secrets(Keychain)。按 status.statusCategory 三桶分 tab。点卡片跳浏览器。 */}
  {/* 未配置引导由宿主通用横幅提供(框架检测 required 设置未填),app 不再手搓。 */}
  {/* 卡片版式对齐 hn:标题走 <Heading level={3}>(不是 muted 小字)、元信息合成一行、
      时间用 |relative 管道(parseDateInput 认 "YYYY-MM-DD HH:MM")、**不用 tailwind
      className**,间距/对齐全走组件 props。pageSize 也跟 hn 取 10,滚动体感一致。 */}
  {/* 同步失败内联提示(不弹 OS 通知)。状态由 ingest job 写进 `sync` 单行 —— 后台层
      (data-only)不能 setState,且 manifest.state 顶层 key 会被重播种、写不持久,故数据驱动。
      <Item> 是模板型 slot:children 第一个必须是 element,裸 `{cond && ...}` 会
      InvalidPlacement,故显式包 <Show when>(守卫只有正向可靠)。 */}
  <DataList collection="sync" query={{ where: { id: "state" }, limit: 1 }}>
    <Item>
      <Show when={item.has_error}>
        <HStack gap={3} align="center">
          <Tag label={t.syncFailed} color="danger" icon="warning"/>
        </HStack>
      </Show>
    </Item>
  </DataList>
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
                <HStack gap={1} align="center">
                  <Icon symbol="clock" size="sm" color="secondary"/>
                  <Text muted>{item.updated | relative}</Text>
                </HStack>
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
                <HStack gap={1} align="center">
                  <Icon symbol="clock" size="sm" color="secondary"/>
                  <Text muted>{item.updated | relative}</Text>
                </HStack>
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
                <HStack gap={1} align="center">
                  <Icon symbol="clock" size="sm" color="secondary"/>
                  <Text muted>{item.updated | relative}</Text>
                </HStack>
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
