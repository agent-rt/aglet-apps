<Page onEnter={() => scripts.init()}>
  <VStack className="p-4 gap-3">

    <HStack justify="between" align="center">
      <Heading level={3} content={t.title}/>
      <Button label={t.refresh} variant="ghost" size="sm" onClick={() => scripts.refresh()}/>
    </HStack>

    {/* 金额 —— 以「基准币」(高亮行)计。右侧 badge 显当前基准币。 */}
    <VStack className="gap-1">
      <Text className="text-xs" color="secondary" content={t.amountLabel}/>
      <HStack className="gap-2 items-center">
        <Input name="amount" bind="/state/amount" placeholder="0" size="sm" className="flex-1"/>
        <Badge content={state.base} color="#14b8a6"/>
      </HStack>
    </VStack>

    {state.err && <Alert color="danger" description={state.err}/>}

    {/* 各币种换算:点某币种 → 设为基准币。● 标当前基准。 */}
    <VStack className="gap-1">
      <For each={state.rows}>
        <HStack justify="between" align="center" className="px-1">
          <HStack className="gap-1 items-center">
            {item.active && <Text content="●" color="#14b8a6"/>}
            <Button label={item.label} variant="ghost" size="sm"
              onClick={() => scripts.setBase({ id: item.id })}/>
          </HStack>
          <Text className="text-sm font-bold" content={item.value}/>
        </HStack>
      </For>
    </VStack>

    {state.updated && <Text className="text-xs" color="secondary" content={state.updated}/>}

  </VStack>
</Page>
