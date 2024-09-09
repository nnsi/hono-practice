/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as TaskImport } from './routes/task'
import { Route as ProfileImport } from './routes/profile'
import { Route as ActivityImport } from './routes/activity'
import { Route as IndexImport } from './routes/index'
import { Route as TaskIdImport } from './routes/task/$id'

// Create/Update Routes

const TaskRoute = TaskImport.update({
  path: '/task',
  getParentRoute: () => rootRoute,
} as any)

const ProfileRoute = ProfileImport.update({
  path: '/profile',
  getParentRoute: () => rootRoute,
} as any)

const ActivityRoute = ActivityImport.update({
  path: '/activity',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const TaskIdRoute = TaskIdImport.update({
  path: '/$id',
  getParentRoute: () => TaskRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/activity': {
      id: '/activity'
      path: '/activity'
      fullPath: '/activity'
      preLoaderRoute: typeof ActivityImport
      parentRoute: typeof rootRoute
    }
    '/profile': {
      id: '/profile'
      path: '/profile'
      fullPath: '/profile'
      preLoaderRoute: typeof ProfileImport
      parentRoute: typeof rootRoute
    }
    '/task': {
      id: '/task'
      path: '/task'
      fullPath: '/task'
      preLoaderRoute: typeof TaskImport
      parentRoute: typeof rootRoute
    }
    '/task/$id': {
      id: '/task/$id'
      path: '/$id'
      fullPath: '/task/$id'
      preLoaderRoute: typeof TaskIdImport
      parentRoute: typeof TaskImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren({
  IndexRoute,
  ActivityRoute,
  ProfileRoute,
  TaskRoute: TaskRoute.addChildren({ TaskIdRoute }),
})

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/activity",
        "/profile",
        "/task"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/activity": {
      "filePath": "activity.tsx"
    },
    "/profile": {
      "filePath": "profile.tsx"
    },
    "/task": {
      "filePath": "task.tsx",
      "children": [
        "/task/$id"
      ]
    },
    "/task/$id": {
      "filePath": "task/$id.tsx",
      "parent": "/task"
    }
  }
}
ROUTE_MANIFEST_END */
