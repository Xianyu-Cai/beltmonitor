/* eslint-disable @typescript-eslint/ban-types */

// Stay consistent with the frontend/src/services/serviceTypes.ts

export interface FetchTypes {
  // 登录
  'POST /api/user/login': {
    req: { username: string; password: string };
    res: {
      success: boolean;
      message: string;
      data: {
        success: boolean;
        userInfo: {
          username: string;
          nickname: string;
          role: string;
          avatarURL: string;
          tel: string;
          email: string;
        };
      };
    };
  };

  // 所有相机状态
  'GET /api/user/getBeltState': {
    req: void;
    res: {
      success: boolean;
      message: string;
      data: {
        cameraTotal: number;
        cameraOnline: number;
        cameraAlarm: number;
        alarmEventPending: number;
        cameraList: {
          cameraName: string;
          cameraID: number;
          cameraStatus: string;
          cameraModel: string;
          rtspUrl: string;
          alarmRules: {
            alarmRuleID: number;
            alarmRuleName: string;
          }[];
          latlng: [number, number];
        }[];
      };
    };
  };

  // 获取某一个相机信息
  'GET /api/user/getCameraInfo': {
    req: { cameraID: number };
    res: {
      data: {
        cameraName: string;
        cameraID: number;
        cameraStatus: string;
        hlsUrl: string;
        latlng: [number, number];
        cameraModel: string;
        alarmRules: {
          alarmRuleID: number;
          alarmRuleName: string;
        }[];
        alarmEvents: {
          eventID: number;
          alarmTime: string;
          alarmRule: {
            alarmRuleID: number;
            alarmRuleName: string;
          };
          resolved: boolean;
        }[];
      };
      message: string;
      success: boolean;
    };
  };

  // 接收取消报警事件
  'POST /api/user/resolveAlarm': {
    req: { eventID: number };
    res: { success: boolean; message: string; data: {} };
  };

  // 获取某一个相机的报警事件列表
  'GET /api/user/getAlarmEvents': {
    req: {
      cameraID?: number;
      current?: number;
      pageSize?: number;
      alarmType?: string;
      cameraName?: string;
      resolved?: string;
      startTime?: string;  // Add startTime parameter for filtering
      endTime?: string;    // Add endTime parameter for filtering
    };
    res: {
      data: {
        total: number;
        list: {
          eventID: number;
          alarmTime: string;
          alarmRule: {
            alarmRuleID: number;
            alarmRuleName: string;
          };
          resolved: boolean;
          cameraID: number;
          cameraName: string;
          cameraLatlng: [number, number];
          cameraModel: string;
          alarmPicUrl: string;
        }[];
      };
      message: string;
      success: boolean;
    };
  };

  // 获取相机列表
  'GET /api/user/getMonitList': {
    req: void;
    res: {
      data: {
        cameraName: string;
        cameraID: number;
        cameraStatus: string;
        hlsUrl: string;
      }[];
      message: string;
      success: boolean;
    };
  };

  // 获取用户信息
  'GET /api/user/getUserInfo': {
    req: void;
    res: {
      data: {
        username: string;
        nickname: string;
        role: string;
        avatarURL: string;
        tel: string;
        email: string;
      };
      message: string;
      success: boolean;
    };
  };

  // 修改用户信息
  'POST /api/user/updateUserInfo': {
    req: {
      username: string;
      nickname: string;
      avatarURL: string;
      tel: string;
      email: string;
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 修改密码
  'POST /api/user/updatePassword': {
    req: {
      oldPassword: string;
      newPassword: string;
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 获取地图配置
  'GET /api/user/getMapConfig': {
    req: void;
    res: {
      data: {
        mapOptions: {
          center: [number, number];
          zoom: number;
          minZoom: number;
          maxZoom: number;
          attributionControl: boolean;
          zoomControl: boolean;
        };
        layer:
        | {
          type: 'imageOverlay';
          url: string;
          bounds: [[number, number], [number, number]];
        }
        | {
          type: 'tileLayer';
          url: string;
        };
      };
      message: string;
      success: boolean;
    };
  };

  // 获取地图配置
  'POST /api/admin/updateMapConfig': {
    req: {
      mapOptions: {
        center: [number, number];
        zoom: number;
        minZoom: number;
        maxZoom: number;
        attributionControl: boolean;
        zoomControl: boolean;
      };
      layer:
      | {
        type: 'imageOverlay';
        url: string;
        bounds: [[number, number], [number, number]];
      }
      | {
        type: 'tileLayer';
        url: string;
      };
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 获取相机列表
  'GET /api/admin/getCameraList': {
    req: void;
    res: {
      data: {
        cameraName: string;
        cameraID: number;
        cameraStatus: string;
        hlsUrl: string;
        rtspUrl: string;
        latlng: [number, number];
        cameraModel: string;
        alarmRules: {
          alarmRuleID: number;
          alarmRuleName: string;
        }[];
      }[];
      message: string;
      success: boolean;
    };
  };

  // 添加相机
  'POST /api/admin/addCamera': {
    req: {
      cameraName: string;
      latlng: [number, number];
      cameraModel: string;
      alarmRuleIDs: number[];
      rtspUrl: string;
      hlsUrl?: string; // 添加可选的 hlsUrl 参数
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 修改相机
  'POST /api/admin/updateCamera': {
    req: {
      cameraID: number;
      cameraName: string;
      latlng: [number, number];
      cameraModel: string;
      alarmRuleIDs: number[];
      rtspUrl: string;
      hlsUrl?: string; // 添加可选的 hlsUrl 参数
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 删除相机
  'POST /api/admin/deleteCamera': {
    req: {
      cameraID: number;
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 获取报警规则列表
  'GET /api/admin/getAlarmRuleList': {
    req: void;
    res: {
      data: {
        alarmRuleID: number;
        alarmRuleName: string;
        relatedCameras: {
          cameraName: string;
          cameraID: number;
        }[];
        enabled: boolean;
        algorithmType: 'belt' | 'coal' | 'big_block' | 'left_axis' | 'right_axis' | 'foreign_object' | 'personnel';
        triggerCondition: {
          time: {
            dayOfWeek: number[];
            timeRange: [string, string];
          };
          count: {
            min: number;
            max: number;
          };
        };
      }[];
      message: string;
      success: boolean;
    };
  };

  // 添加报警规则
  'POST /api/admin/addAlarmRule': {
    req: {
      relatedCameraIds: number[];
      alarmRuleName: string;
      enabled: boolean;
      algorithmType: 'belt' | 'coal' | 'big_block' | 'left_axis' | 'right_axis' | 'foreign_object' | 'personnel';
      triggerCondition: {
        time: {
          dayOfWeek: number[];
          timeRange: [string, string];
        };
        count: {
          min: number;
          max: number;
        };
      };
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 修改报警规则
  'POST /api/admin/updateAlarmRule': {
    req: {
      alarmRuleID: number;
      alarmRuleName: string;
      relatedCameraIds: number[];
      enabled: boolean;
      algorithmType: 'belt' | 'coal' | 'big_block' | 'left_axis' | 'right_axis' | 'foreign_object' | 'personnel';
      triggerCondition: {
        time: {
          dayOfWeek: number[];
          timeRange: [string, string];
        };
        count: {
          min: number;
          max: number;
        };
      };
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 删除报警规则
  'POST /api/admin/deleteAlarmRule': {
    req: {
      alarmRuleID: number;
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 获取用户列表
  'GET /api/admin/getUserList': {
    req: void;
    res: {
      data: {
        username: string;
        nickname: string;
        role: string;
        avatarURL: string;
        tel: string;
        email: string;
      }[];
      message: string;
      success: boolean;
    };
  };

  // 添加用户
  'POST /api/admin/addUser': {
    req: {
      username: string;
      role: string;
      nickname: string;
      tel?: string;
      email?: string;
      password: string;
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 修改用户
  'POST /api/admin/updateUser': {
    req: {
      username: string;
      role: string;
      nickname: string;
      tel?: string;
      email?: string;
      newPassword?: string;
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 删除用户
  'POST /api/admin/deleteUser': {
    req: {
      username: string;
    };
    res: {
      data: {};
      message: string;
      success: boolean;
    };
  };

  // 获取离线相机列表
  'GET /api/ai/getOfflineCameraList': {
    req: {
      adminUsername: string;
      password: string;
    };
    res: {
      data: {
        cameraID: number;
      }[];
      message: string;
      success: boolean;
    };
  };

  // 增加报警事件
  'POST /api/user/addAlarmEvent': {
    req: {
      cameraID: number;
      alarmType: string;
      picFilePath: string;
      confidence: number;
      alarmRuleId?: number; // 添加报警规则ID参数
    };
    res: {
      success: boolean;
      message: string;
      data: {
        eventID: number;
      };
    };
  };

  // 获取AI配置
  'GET /api/admin/aiconfig': {
    req: void;
    res: {
      success: boolean;
      message: string;
      data: {
        belt_scale: number;
        person_region: [number, number, number, number];
        original_region: string;
        smoke_threshold: number;
      };
    };
  };

  // 修改AI配置
  'POST /api/admin/aiconfig': {
    req: {
      belt_scale: number;
      person_region: [number, number, number, number];
      original_region: string;
      smoke_threshold: number;
    };
    res: {
      success: boolean;
      message: string;
      data: void;
    };
  };

  // 获取特定摄像头的AI配置
  'GET /api/admin/getCameraAIConfig': {
    req: { cameraId: number };
    res: {
      success: boolean;
      message: string;
      data: {
        belt_scale: number;
        person_region: [number, number, number, number];
        original_region: string;
        smoke_threshold: number;
        large_block_radio: number;
      };
    };
  };

  // 更新特定摄像头的AI配置
  'POST /api/admin/updateCameraAIConfig': {
    req: {
      cameraId: number;
      belt_scale?: number;
      person_region?: [number, number, number, number];
      original_region?: string;
      smoke_threshold?: number;
      large_block_radio?: number;
    };
    res: {
      success: boolean;
      message: string;
      data: void;
    };
  };

  'GET /api/ai/resolveStream': {
    req: { camera: number };
    res: { StreamUrl: string };
  }
}

export type fetchUrls = keyof FetchTypes extends `${string} ${infer Url}`
  ? Url
  : never;

declare module '@nestjs/common' {
  export const Get: (path?: fetchUrls) => MethodDecorator;
  export const Post: (path?: fetchUrls) => MethodDecorator;
}