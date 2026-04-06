
import api from "../config/axios";
import type { BaseResponse, PaginatedResponse } from "../types";

export default class BaseService<T> {
  axios = api;
  route: string;
  constructor(route: string) {
    this.route = route;
  }

  async get(
    params: {
      paginate?: boolean;
      currentPage?: number;
      amountPerPage?: number;
      detalle?: boolean;
      searchParams?: { key: string; value: any }[];
    } = {
      paginate: false,
      currentPage: 1,
      amountPerPage: 10,
      detalle: false,
      searchParams: [],
    },
  ): Promise<BaseResponse<PaginatedResponse<T>>> {
    try {
      let paramBuilder = "?";
      if (params.paginate) {
        paramBuilder += "paginate=true&";
        if (params.currentPage) {
          paramBuilder +=
            "currentPage=" + params.currentPage + "&";
        }
        if (params.amountPerPage) {
          paramBuilder +=
            "amountPerPage=" + params.amountPerPage + "&";
        }
      }
      if (params.detalle) {
        paramBuilder += "detalle=" + params.detalle + "&";
      }
      if (params.searchParams && params.searchParams?.length > 0) {
        paramBuilder += params.searchParams.map((param) => {
          return param.key + "=" + param.value + "&";
        });
      }
      const response = await this.axios.get(
        this.route + paramBuilder,
      );
      return response.data;
    } catch (err: any) {
      console.log(err);
      throw err;
    }
  }

  async getOne(id: any): Promise<BaseResponse<T>> {
    console.log(id)
    const response = await this.axios.get(this.route + "/" + id);
    return response.data;
  }

  async create(data: T): Promise<BaseResponse<T>> {
    const response = await this.axios.post(this.route, data);
    return response.data;
  }
}