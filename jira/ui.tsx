<Page onEnter={() => scripts.refreshNow()}>
  {/* Jira 只读看板:Atlassian REST API + API token 直连(零 CLI)。凭据在「设置」tab 填,
      token 存 secrets(Keychain)。按 status.statusCategory 三桶分 tab。点卡片跳浏览器。 */}
  {/* 未配置引导由宿主通用横幅提供(框架检测 required 设置未填),app 不再手搓。 */}
  {/* 同步失败内联提示(不弹 OS 通知)。状态由 ingest job 写进 `sync` 单行 —— 后台层
      (data-only)不能 setState,且 manifest.state 顶层 key 会被重播种、写不持久,故数据驱动。
      守卫必须**正向**(`item.has_error &&`),否定式会编出无 when 的 If → web 显 native 隐。 */}
  {/* <Item> 是模板型 slot:children 第一个必须是 **element**,不能是裸 `{cond && ...}`
      表达式(会 InvalidPlacement)。故显式包一层 <Show when>。 */}
  <DataList collection="sync" query={{ where: { id: "state" }, limit: 1 }}>
    <Item>
      <Show when={item.has_error}>
        <HStack gap={3} className="items-center px-4 py-2">
          <Tag label={t.syncFailed} color="danger" icon="warning"/>
        </HStack>
      </Show>
    </Item>
  </DataList>
  <Tabs id="main" defaultValue="doing" position="bottom">

    <Tab value="doing" label={t.tabDoing} icon="arrow-right">
      <DataList collection="issues"
        query={{ where: { bucket: "doing" }, orderBy: [{ field: "updated", direction: "desc" }] }} paginate={{ pageSize: 20, infinite: true }}>
        <Empty><EmptyState title={t.emptyDoingTitle} description={t.emptyDoingDesc} icon="coffee"/></Empty>
        <Item>
          <Card>
            <VStack gap={6}>
              <HStack gap={6} justify="between" className="items-center">
                <Text muted className="font-mono">{item.key}</Text>
                <Tag label={item.status} color="primary" size="sm"/>
              </HStack>
              <Text>{item.summary}</Text>
              <HStack gap={3} className="items-center">
                <Text muted className="text-xs">{t.created}</Text>
                <Text muted className="text-xs">{item.created}</Text>
                <Text muted className="text-xs">·</Text>
                <Text muted className="text-xs">{t.updated}</Text>
                <Text muted className="text-xs">{item.updated}</Text>
              </HStack>
              <HStack gap={6} justify="end" className="items-center">
                <Link label={t.openJira} icon="arrow-square-out" href={item.url}/>
              </HStack>
            </VStack>
          </Card>
        </Item>
      </DataList>
    </Tab>

    <Tab value="todo" label={t.tabTodo} icon="tray">
      <DataList collection="issues"
        query={{ where: { bucket: "todo" }, orderBy: [{ field: "updated", direction: "desc" }] }} paginate={{ pageSize: 20, infinite: true }}>
        <Empty><EmptyState title={t.emptyTodoTitle} description={t.emptyTodoDesc} icon="tray"/></Empty>
        <Item>
          <Card>
            <VStack gap={6}>
              <HStack gap={6} justify="between" className="items-center">
                <Text muted className="font-mono">{item.key}</Text>
                <Tag label={item.status} color="warning" size="sm"/>
              </HStack>
              <Text>{item.summary}</Text>
              <HStack gap={3} className="items-center">
                <Text muted className="text-xs">{t.created}</Text>
                <Text muted className="text-xs">{item.created}</Text>
                <Text muted className="text-xs">·</Text>
                <Text muted className="text-xs">{t.updated}</Text>
                <Text muted className="text-xs">{item.updated}</Text>
              </HStack>
              <HStack gap={6} justify="end" className="items-center">
                <Link label={t.openJira} icon="arrow-square-out" href={item.url}/>
              </HStack>
            </VStack>
          </Card>
        </Item>
      </DataList>
    </Tab>

    <Tab value="done" label={t.tabDone} icon="check-circle">
      <DataList collection="issues"
        query={{ where: { bucket: "done" }, orderBy: [{ field: "updated", direction: "desc" }] }} paginate={{ pageSize: 20, infinite: true }}>
        <Empty><EmptyState title={t.emptyDoneTitle} description={t.emptyDoneDesc} icon="check-circle"/></Empty>
        <Item>
          <Card>
            <VStack gap={6}>
              <HStack gap={6} justify="between" className="items-center">
                <Text muted className="font-mono">{item.key}</Text>
                <Tag label={item.status} color="success" size="sm"/>
              </HStack>
              <Text>{item.summary}</Text>
              <HStack gap={3} className="items-center">
                <Text muted className="text-xs">{t.created}</Text>
                <Text muted className="text-xs">{item.created}</Text>
                <Text muted className="text-xs">·</Text>
                <Text muted className="text-xs">{t.updated}</Text>
                <Text muted className="text-xs">{item.updated}</Text>
              </HStack>
              <HStack gap={6} justify="end" className="items-center">
                <Link label={t.openJira} icon="arrow-square-out" href={item.url}/>
              </HStack>
            </VStack>
          </Card>
        </Item>
      </DataList>
    </Tab>

  </Tabs>
</Page>
