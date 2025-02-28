/*!
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useCallback, useEffect } from "react";
import {
  Flex,
  Divider,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Tab,
  Text,
} from "@chakra-ui/react";
import { useSearchParams } from "react-router-dom";

import useSelection from "src/dag/useSelection";
import { getTask, getMetaValue } from "src/utils";
import { useGridData, useTaskInstance } from "src/api";
import { MdDetails, MdAccountTree, MdReorder } from "react-icons/md";
import { BiBracket } from "react-icons/bi";
import URLSearchParamsWrapper from "src/utils/URLSearchParamWrapper";

import Header from "./Header";
import TaskInstanceContent from "./taskInstance";
import DagRunContent from "./dagRun";
import DagContent from "./Dag";
import Graph from "./graph";
import MappedInstances from "./taskInstance/MappedInstances";
import Logs from "./taskInstance/Logs";
import BackToTaskSummary from "./taskInstance/BackToTaskSummary";
import FilterTasks from "./FilterTasks";

const dagId = getMetaValue("dag_id")!;

interface Props {
  openGroupIds: string[];
  onToggleGroups: (groupIds: string[]) => void;
}

const tabToIndex = (tab?: string) => {
  switch (tab) {
    case "graph":
      return 1;
    case "logs":
    case "mapped_tasks":
      return 2;
    case "details":
    default:
      return 0;
  }
};

const indexToTab = (
  index: number,
  showLogs: boolean,
  showMappedTasks: boolean
) => {
  switch (index) {
    case 1:
      return "graph";
    case 2:
      if (showMappedTasks) return "mapped_tasks";
      if (showLogs) return "logs";
      return undefined;
    case 0:
    default:
      return undefined;
  }
};

const TAB_PARAM = "tab";

const Details = ({ openGroupIds, onToggleGroups }: Props) => {
  const {
    selected: { runId, taskId, mapIndex },
    onSelect,
  } = useSelection();
  const isDag = !runId && !taskId;
  const isDagRun = runId && !taskId;
  const isTaskInstance = taskId && runId;

  const {
    data: { dagRuns, groups },
  } = useGridData();
  const group = getTask({ taskId, task: groups });
  const children = group?.children;
  const isMapped = group?.isMapped;

  const isMappedTaskSummary = isMapped && mapIndex === undefined && taskId;
  const isGroup = !!children;
  const isGroupOrMappedTaskSummary = isGroup || isMappedTaskSummary;
  const showLogs = !!(isTaskInstance && !isGroupOrMappedTaskSummary);
  const showMappedTasks = !!(isTaskInstance && isMappedTaskSummary && !isGroup);

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get(TAB_PARAM) || undefined;
  const tabIndex = tabToIndex(tab);

  const onChangeTab = useCallback(
    (index: number) => {
      const params = new URLSearchParamsWrapper(searchParams);
      const newTab = indexToTab(index, showLogs, showMappedTasks);
      if (newTab) params.set(TAB_PARAM, newTab);
      else params.delete(TAB_PARAM);
      setSearchParams(params);
    },
    [setSearchParams, searchParams, showLogs, showMappedTasks]
  );

  useEffect(() => {
    if ((!taskId || isGroup) && tabIndex > 1) {
      onChangeTab(1);
    }
  }, [runId, taskId, tabIndex, isGroup, onChangeTab]);

  const run = dagRuns.find((r) => r.runId === runId);
  const { data: mappedTaskInstance } = useTaskInstance({
    dagId,
    dagRunId: runId || "",
    taskId: taskId || "",
    mapIndex,
    enabled: mapIndex !== undefined,
  });

  const instance =
    mapIndex !== undefined && mapIndex > -1
      ? mappedTaskInstance
      : group?.instances.find((ti) => ti.runId === runId);

  return (
    <Flex flexDirection="column" pl={3} height="100%">
      <Flex alignItems="center" justifyContent="space-between">
        <Header />
        <Flex>{taskId && runId && <FilterTasks taskId={taskId} />}</Flex>
      </Flex>
      <Divider my={2} />
      <Tabs
        size="lg"
        isLazy
        height="100%"
        index={tabIndex}
        onChange={onChangeTab}
      >
        <TabList>
          <Tab>
            <MdDetails size={16} />
            <Text as="strong" ml={1}>
              Details
            </Text>
          </Tab>
          <Tab>
            <MdAccountTree size={16} />
            <Text as="strong" ml={1}>
              Graph
            </Text>
          </Tab>
          {showLogs && (
            <Tab>
              <MdReorder size={16} />
              <Text as="strong" ml={1}>
                Logs
              </Text>
            </Tab>
          )}
          {showMappedTasks && (
            <Tab>
              <BiBracket size={16} />
              <Text as="strong" ml={1}>
                Mapped Tasks
              </Text>
            </Tab>
          )}
        </TabList>
        <TabPanels height="100%">
          <TabPanel height="100%">
            {isDag && <DagContent />}
            {isDagRun && <DagRunContent runId={runId} />}
            {isTaskInstance && (
              <>
                <BackToTaskSummary
                  isMapIndexDefined={mapIndex !== undefined && mapIndex > -1}
                  onClick={() => onSelect({ runId, taskId })}
                />
                <TaskInstanceContent
                  runId={runId}
                  taskId={taskId}
                  mapIndex={mapIndex}
                />
              </>
            )}
          </TabPanel>
          <TabPanel p={0} height="100%">
            <Graph
              openGroupIds={openGroupIds}
              onToggleGroups={onToggleGroups}
            />
          </TabPanel>
          {showLogs && run && (
            <TabPanel
              pt={mapIndex !== undefined ? "0px" : undefined}
              height="100%"
            >
              <BackToTaskSummary
                isMapIndexDefined={mapIndex !== undefined}
                onClick={() => onSelect({ runId, taskId })}
              />
              <Logs
                dagId={dagId}
                dagRunId={runId}
                taskId={taskId}
                mapIndex={mapIndex}
                executionDate={run?.executionDate}
                tryNumber={instance?.tryNumber}
                state={instance?.state}
              />
            </TabPanel>
          )}
          {showMappedTasks && (
            <TabPanel height="100%">
              <MappedInstances
                dagId={dagId}
                runId={runId}
                taskId={taskId}
                onRowClicked={(row) =>
                  onSelect({ runId, taskId, mapIndex: row.values.mapIndex })
                }
              />
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Flex>
  );
};

export default Details;
