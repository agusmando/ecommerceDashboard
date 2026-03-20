import axios from "axios";
import type { BaseResponse, PaginatedResponse } from "../types";

export default class BaseService<T> {
  baseUrl: string;
  route: string;
  constructor(route: string) {
    this.route = route;
    this.baseUrl = "https://canelaenramaback.onrender.com/api/";
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
    const response = await axios.get(
      this.baseUrl + this.route + paramBuilder,
    );
    return response.data;
  }

  async getOne(id: number): Promise<BaseResponse<T>> {
    console.log(id)
    const response = await axios.get(this.baseUrl + this.route + "/" + id);
    return response.data;
  }

  async create(data: T): Promise<BaseResponse<T>> {
    const response = await axios.post(this.baseUrl + this.route, data);
    return response.data;
  }
}