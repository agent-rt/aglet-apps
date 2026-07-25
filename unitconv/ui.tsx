<Page onEnter={() => scripts.init()}>
  <VStack className="p-4 gap-3">

    <Heading level={3} content={t.title}/>

    {/* 分类切换：改 cat → 重置 base + 重算 rows。 */}
    <SegmentedControl name="cat" bind="/state/cat" size="sm" options={[
      { value: "length", label: t.lengthLabel },
      { value: "weight", label: t.weight },
      { value: "temp", label: t.temp },
      { value: "data", label: t.data },
    ]}/>

    {/* 输入值 —— 当前以「输入单位」(高亮行)计。右侧显示当前单位。 */}
    <VStack className="gap-1">
      <Text className="text-xs" color="secondary" content={t.valueLabel}/>
      <HStack className="gap-2 items-center">
        <Input name="val" bind="/state/val" placeholder="0" size="sm" className="flex-1"/>
        <Badge content={state.baseLabel} color="#14b8a6"/>
      </HStack>
    </VStack>

    {/* 全单位换算列表:点某行 → 设为输入单位。active 行左侧加实心点。 */}
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

  </VStack>
</Page>
