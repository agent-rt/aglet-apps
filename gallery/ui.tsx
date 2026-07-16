<Page onEnter={() => scripts.seed()}>
  <Tabs id="gallery" defaultValue="basics">

    {/* ══ BASICS: 文本 / 动作 / 视觉标记 ══════════════════════════ */}
    <Tab value="basics" label="Basics" icon="text-aa">
      <VStack gap={4}>
        <Card title="Typography" description="Heading / Text / Markdown / CodeBlock / Link">
          <VStack gap={2}>
            <Heading content="Heading level 1" level={1}/>
            <Heading content="Heading level 2" level={2}/>
            <Heading content="Heading level 3" level={3}/>
            <Heading content="Heading level 4" level={4}/>
            <Divider/>
            <Text content="Body text — default。"/>
            <Text content="Body text — muted（次要说明）。" muted/>
            <HStack gap={3} className="flex-wrap">
              <Text content="primary" color="primary"/>
              <Text content="success" color="success"/>
              <Text content="warning" color="warning"/>
              <Text content="danger" color="danger"/>
            </HStack>
            <HStack gap={3} align="baseline" className="flex-wrap">
              <Text content="sm" size="sm"/>
              <Text content="md" size="md"/>
              <Text content="lg" size="lg"/>
            </HStack>
            <Divider/>
            <Markdown source="**Markdown** 支持 `inline code`、[链接](https://aglet.dev) 与 *斜体*。"/>
            <CodeBlock code={"fn main() {\n    println!(\"hello aglet\");\n}"} lang="rust"/>
            <Link label="External link" href="https://aglet.dev" icon="arrow-square-out"/>
          </VStack>
        </Card>

        <Card title="Actions" description="Button variants × colors × states">
          <VStack gap={3}>
            <Text content="color (variant=solid)" muted size="sm"/>
            <HStack gap={2} className="flex-wrap">
              <Button label="Default"/>
              <Button label="Primary" color="primary"/>
              <Button label="Secondary" color="secondary"/>
              <Button label="Success" color="success"/>
              <Button label="Warning" color="warning"/>
              <Button label="Danger" color="danger"/>
            </HStack>
            <Text content="variant (color=primary)" muted size="sm"/>
            <HStack gap={2} className="flex-wrap">
              <Button label="solid" color="primary" variant="solid"/>
              <Button label="bordered" color="primary" variant="bordered"/>
              <Button label="flat" color="primary" variant="flat"/>
              <Button label="ghost" color="primary" variant="ghost"/>
              <Button label="light" color="primary" variant="light"/>
            </HStack>
            <Text content="states / icons / sizes" muted size="sm"/>
            <HStack gap={2} className="flex-wrap" align="center">
              <Button label="Loading" color="primary" loading/>
              <Button label="Disabled" disabled/>
              <Button label="Left icon" leftIcon="plus" color="primary" variant="flat"/>
              <Button label="Right icon" rightIcon="caret-down" variant="bordered"/>
              <Button icon="trash" color="danger" variant="light"/>
              <Button label="sm" size="sm" color="primary"/>
              <Button label="lg" size="lg" color="primary"/>
            </HStack>
          </VStack>
        </Card>

        <Card title="Visual" description="Badge / Tag / Icon / Avatar / Image">
          <VStack gap={3}>
            <HStack gap={2} className="flex-wrap" align="center">
              <Badge content="default"/>
              <Badge content="primary" color="primary"/>
              <Badge content="success" color="success"/>
              <Badge content="warning" color="warning"/>
              <Badge content="danger" color="danger"/>
              <Badge content="dot" dot color="success"/>
              <Badge content="with icon" icon="star" color="warning"/>
            </HStack>
            <HStack gap={2} className="flex-wrap" align="center">
              <Tag label="removable" color="primary" removable/>
              <Tag label="with icon" icon="tag" color="success"/>
              <Tag label="plain"/>
            </HStack>
            <HStack gap={3} className="flex-wrap" align="center">
              <Icon symbol="bell" color="primary"/>
              <Icon symbol="heart" color="danger"/>
              <Icon symbol="star" color="warning"/>
              <Icon symbol="check-circle" color="success"/>
              <Icon symbol="cloud" size="lg"/>
              <Avatar name="Amelia Chen"/>
              <Avatar name="Bruno Sato" shape="square"/>
              <Avatar src="https://api.iconify.design/ph/user-fill.svg" size="lg"/>
            </HStack>
            <Image src="https://api.iconify.design/ph/image-fill.svg?color=%233a6ea5" alt="demo" width={64} height={64}/>
          </VStack>
        </Card>
      </VStack>
    </Tab>

    {/* ══ LAYOUT ═════════════════════════════════════════════════ */}
    <Tab value="layout" label="Layout" icon="layout">
      <VStack gap={4}>
        <Card title="Stacks" description="HStack / VStack align">
          <VStack gap={3}>
            <HStack gap={2} align="center" className="rounded-md bg-[var(--ag-surface-2)] p-2">
              <Badge content="a"/><Badge content="b"/><Badge content="c"/>
              <Spacer/>
              <Badge content="right" color="primary"/>
            </HStack>
            <HStack gap={4} align="start">
              <VStack gap={1}><Text content="col 1" muted size="sm"/><Text content="left"/></VStack>
              <VStack gap={1}><Text content="col 2" muted size="sm"/><Text content="middle"/></VStack>
              <VStack gap={1}><Text content="col 3" muted size="sm"/><Text content="right"/></VStack>
            </HStack>
          </VStack>
        </Card>

        <Card title="Grid" description="cols × gap">
          <Grid cols={3} gap={8}>
            <Card title="One"><Text content="grid cell 1" muted size="sm"/></Card>
            <Card title="Two"><Text content="grid cell 2" muted size="sm"/></Card>
            <Card title="Three"><Text content="grid cell 3" muted size="sm"/></Card>
            <Card title="Four"><Text content="grid cell 4" muted size="sm"/></Card>
            <Card title="Five"><Text content="grid cell 5" muted size="sm"/></Card>
            <Card title="Six"><Text content="grid cell 6" muted size="sm"/></Card>
          </Grid>
        </Card>

        <Section title="Section">
          <Text content="Section 是带标题的内容分段（比 Card 轻，无边框盒）。"/>
          <Text content="第二行内容。" muted size="sm"/>
        </Section>
      </VStack>
    </Tab>

    {/* ══ INPUTS（DataForm 提供 form scope）══════════════════════ */}
    <Tab value="inputs" label="Inputs" icon="textbox">
      <VStack gap={4}>
        <Card title="Text inputs">
          <DataForm collection="people">
            <VStack gap={3}>
              <Input name="g_name" label="Text input" placeholder="Your name"/>
              <Input name="g_err" label="With error" placeholder="invalid" error="This field is required"/>
              <Input name="g_amount" label="With affixes" placeholder="0.00" prefix="$" suffix="USD"/>
              <Input name="g_pw" label="Password" type="password" placeholder="secret"/>
              <Textarea name="g_bio" label="Textarea" placeholder="Multi-line text…" rows={3}/>
            </VStack>
          </DataForm>
        </Card>

        <Card title="Choice inputs">
          <DataForm collection="people">
            <VStack gap={3}>
              <Select name="g_fruit" label="Select (static)" placeholder="Pick one">
                <Option value="apple" label="Apple"/>
                <Option value="banana" label="Banana"/>
                <Option value="cherry" label="Cherry"/>
              </Select>
              <Select name="g_person" label="Select (collection-driven)" collection="people" optionValue="name" optionLabel="name" placeholder="Pick a person"/>
              <Combobox name="g_city" label="Combobox (searchable)" placeholder="Search city">
                <Option value="tokyo" label="Tokyo"/>
                <Option value="osaka" label="Osaka"/>
                <Option value="kyoto" label="Kyoto"/>
                <Option value="nagoya" label="Nagoya"/>
              </Combobox>
              <SegmentedControl name="g_view" label="SegmentedControl" options={[
                { value: "list", label: "List", icon: "list" },
                { value: "grid", label: "Grid", icon: "squares-four" },
                { value: "map", label: "Map", icon: "map-pin" },
              ]}/>
              <RadioGroup name="g_plan" label="RadioGroup">
                <Radio value="free" label="Free"/>
                <Radio value="pro" label="Pro"/>
                <Radio value="team" label="Team"/>
              </RadioGroup>
            </VStack>
          </DataForm>
        </Card>

        <Card title="Toggles & values">
          <DataForm collection="people">
            <VStack gap={3}>
              <HStack gap={5} className="flex-wrap">
                <Switch name="g_notify" label="Switch"/>
                <Checkbox name="g_agree" label="Checkbox"/>
              </HStack>
              <NumberField name="g_qty" label="NumberField" min={0} max={10} step={1}/>
              <Slider name="g_vol" label="Slider" min={0} max={100} step={5} showValue/>
              <DatePicker name="g_due" label="DatePicker"/>
            </VStack>
          </DataForm>
        </Card>
      </VStack>
    </Tab>

    {/* ══ DATA ═══════════════════════════════════════════════════ */}
    <Tab value="data" label="Data" icon="database">
      <VStack gap={4}>
        <Card title="DataList" description="collection=people, ordered by score desc">
          <DataList collection="people" query={{ orderBy: [{ field: "score", direction: "desc" }], limit: 4 }}>
            <Empty>
              <EmptyState title="No data" description="seed() 未运行" icon="tray"/>
            </Empty>
            <Item>
              <HStack gap={3} align="center" className="rounded-md bg-[var(--ag-surface-2)] p-2">
                <Avatar name={{ op: "state", path: "/item/name" }}/>
                <VStack gap={0}>
                  <Text content={{ op: "state", path: "/item/name" }}/>
                  <Text content={{ op: "state", path: "/item/role" }} muted size="sm"/>
                </VStack>
                <Spacer/>
                <Badge content={{ op: "state", path: "/item/score" }} color="primary"/>
              </HStack>
            </Item>
          </DataList>
        </Card>

        <Card title="Table + Pagination" description="collection=people, pageSize 3">
          <VStack gap={3}>
            <Table collection="people" query={{ orderBy: [{ field: "n", direction: "asc" }], limit: 3 }}>
              <Column key="name" label="Name"/>
              <Column key="role" label="Role"/>
              <Column key="city" label="City"/>
              <Column key="score" label="Score"/>
            </Table>
            <Pagination collection="people" pageSize={3}/>
          </VStack>
        </Card>

        <Card title="DataScope" description="latest metric row injected as /data/cur">
          <DataScope alias="cur" collection="metrics" latest>
            <HStack gap={4}>
              <VStack gap={0}><Text content="cpu" muted size="sm"/><Heading level={3} content={{ op: "state", path: "/data/cur/cpu" }}/></VStack>
              <VStack gap={0}><Text content="mem" muted size="sm"/><Heading level={3} content={{ op: "state", path: "/data/cur/mem" }}/></VStack>
            </HStack>
          </DataScope>
        </Card>

        <Card title="For + Show" description="inline array + conditional">
          <VStack gap={3}>
            <HStack gap={2} className="flex-wrap">
              <For each={["Rust", "Zig", "Swift", "Kotlin"]}>
                <Tag label={{ op: "state", path: "/item" }} color="primary"/>
              </For>
            </HStack>
            <Switch bind="/state/showExtra" label="Toggle conditional content"/>
            <Show when={{ op: "state", path: "/state/showExtra" }}>
              <Alert title="Now visible" description="Show when=true 才渲染这段。" color="success"/>
            </Show>
          </VStack>
        </Card>
      </VStack>
    </Tab>

    {/* ══ FEEDBACK ═══════════════════════════════════════════════ */}
    <Tab value="feedback" label="Feedback" icon="gauge">
      <VStack gap={4}>
        <Card title="Progress & Meter">
          <VStack gap={3}>
            <Progress label="Progress 30%" value={30} max={100}/>
            <Progress label="Progress 70% (success)" value={70} max={100} color="success"/>
            <Progress label="Indeterminate" indeterminate/>
            <Meter label="Meter 0.6" value={0.6} min={0} max={1}/>
            <Meter label="Meter 0.9 (danger)" value={0.9} min={0} max={1} color="danger"/>
          </VStack>
        </Card>

        <Card title="Alert" description="colors × dismissable">
          <VStack gap={2}>
            <Alert title="Info" description="An informational alert." color="primary"/>
            <Alert title="Success" description="Operation completed." color="success"/>
            <Alert title="Warning" description="Something needs attention." color="warning"/>
            <Alert title="Danger" description="Something went wrong." color="danger" dismissable/>
          </VStack>
        </Card>

        <Card title="Skeleton / EmptyState / Tooltip">
          <VStack gap={3}>
            <Skeleton lines={3}/>
            <HStack gap={2} align="center">
              <Skeleton shape="circle" width={40} height={40}/>
              <Skeleton width={160}/>
            </HStack>
            <Divider/>
            <EmptyState title="Nothing here" description="Empty state placeholder." icon="tray"/>
            <Tooltip content="This is a tooltip">
              <Button label="Hover me" leftIcon="info" variant="bordered"/>
            </Tooltip>
          </VStack>
        </Card>
      </VStack>
    </Tab>

    {/* ══ OVERLAYS & NAV ═════════════════════════════════════════ */}
    <Tab value="overlays" label="Overlays" icon="stack">
      <VStack gap={4}>
        <Card title="Overlays" description="click to open">
          <HStack gap={2} className="flex-wrap" align="center">
            <Modal trigger={<Button label="Open Modal" color="primary"/>} title="Modal title" description="A modal dialog." confirm confirmLabel="OK" cancelLabel="Cancel">
              <Text content="Modal body content."/>
            </Modal>
            <Drawer id="g_drawer" trigger={<Button label="Open Drawer"/>} title="Drawer panel" side="right">
              <Text content="Slides up as a native sheet on macOS."/>
            </Drawer>
            <Popover id="g_popover" trigger={<Button label="Open Popover" variant="bordered"/>} placement="bottom">
              <Text content="Anchored popover content."/>
              <Button label="Action" size="sm" color="primary"/>
            </Popover>
            <Menu id="g_menu" trigger={<Button label="Menu" rightIcon="caret-down"/>}>
              <MenuItem label="Edit" icon="pencil-simple"/>
              <MenuItem label="Duplicate" icon="copy"/>
              <MenuItem separator/>
              <MenuItem label="Delete" icon="trash" danger/>
            </Menu>
          </HStack>
        </Card>

        <Card title="Navigation" description="Breadcrumb / Accordion / nested Tabs">
          <VStack gap={3}>
            <Breadcrumb>
              <BreadcrumbItem label="Home" icon="house"/>
              <BreadcrumbItem label="Library"/>
              <BreadcrumbItem label="Components"/>
            </Breadcrumb>
            <Accordion id="g_acc">
              <AccordionItem header="Basic settings" icon="sliders">
                <Text content="Accordion panel one."/>
              </AccordionItem>
              <AccordionItem header="Advanced settings" icon="gear">
                <Text content="Accordion panel two."/>
              </AccordionItem>
            </Accordion>
            <Tabs id="g_nested" defaultValue="one">
              <Tab value="one" label="First" icon="number-one">
                <Text content="Nested tab one."/>
              </Tab>
              <Tab value="two" label="Second" icon="number-two">
                <Text content="Nested tab two."/>
              </Tab>
            </Tabs>
          </VStack>
        </Card>
      </VStack>
    </Tab>

    {/* ══ CHARTS ═════════════════════════════════════════════════ */}
    <Tab value="charts" label="Charts" icon="chart-line">
      <VStack gap={4}>
        <Card title="Chart — line">
          <Chart collection="metrics" kind="line" xField="ts" yField="cpu" query={{ orderBy: [{ field: "ts", direction: "asc" }] }}/>
        </Card>
        <Card title="Chart — bar">
          <Chart collection="metrics" kind="bar" xField="ts" yField="mem" query={{ orderBy: [{ field: "ts", direction: "asc" }] }}/>
        </Card>
        <Card title="Chart — multi-series">
          <Chart collection="metrics" kind="line" xField="ts" query={{ orderBy: [{ field: "ts", direction: "asc" }] }} series={[
            { field: "cpu", label: "CPU", color: "blue" },
            { field: "mem", label: "Mem", color: "orange" },
          ]}/>
        </Card>
        <Card title="Sparkline">
          <Sparkline collection="metrics" field="cpu" color="primary"/>
        </Card>
        <Card title="Map" description="collection=places, polyline route">
          <Map collection="places" latField="lat" lngField="lng" labelField="name" polyline height={280} query={{ orderBy: [{ field: "n", direction: "asc" }] }}/>
        </Card>
      </VStack>
    </Tab>

    {/* ══ ROUTER ═════════════════════════════════════════════════ */}
    <Tab value="router" label="Router" icon="signpost">
      <Router initial="/">
        <Page path="/" title="List">
          <VStack gap={3}>
            <Text content="Router push/pop with a native NavigationStack."/>
            <Button label="Push detail →" color="primary" onClick={() => router.push({ path: "/detail" })}/>
          </VStack>
        </Page>
        <Page path="/detail" title="Detail">
          <VStack gap={3}>
            <Text content="Pushed page. Use back or the button."/>
            <Button label="← Pop" variant="bordered" onClick={() => router.pop()}/>
          </VStack>
        </Page>
      </Router>
    </Tab>

  </Tabs>
</Page>
